import { chromium } from "playwright";
import fs from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import path from "path";

// ====== Config ======
const URL = "https://foservices.icegate.gov.in/#/services/notifyPublishScreen";
const OUT_DIR = "icegate_pdfs";
const PAGE_TIMEOUT = 60000;
const CLICK_TIMEOUT = 30000;
const SLEEP_BETWEEN = 800;

// ====== Helpers ======
const ensureDir = (dirPath) => {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
};

const sanitizeFilename = (s) => {
  if (!s) {
    return "unknown";
  }
  return s
    .trim()
    .replace(/[\/\\:\*\?\"<>\|]+/g, "_")
    .replace(/\s+/g, "_");
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const findHeaderIndices = async (page) => {
  try {
    let headerCells = await page.$$("table thead th");
    if (!headerCells || headerCells.length === 0) {
      headerCells = await page.$$("thead th");
    }

    const headers = await Promise.all(headerCells.map((h) => h.innerText()));
    const headersLower = headers.map((h) => h.trim().toLowerCase());

    let notifIdx = null;
    let dateIdx = null;

    for (let i = 0; i < headersLower.length; i++) {
      const h = headersLower[i];
      if (h.includes("notification") && notifIdx === null) {
        notifIdx = i;
      }
      if (h.includes("publish") && dateIdx === null) {
        dateIdx = i;
      }
      if (h === "date" && dateIdx === null) {
        dateIdx = i;
      }
    }

    return {
      notifIdx: notifIdx ?? 1,
      dateIdx: dateIdx ?? 2,
    };
  } catch (e) {
    console.warn("Could not find headers, falling back...", e.message);
    return { notifIdx: 1, dateIdx: 2 };
  }
};

// ====== PDF Parsing with PDF.js ======
const parseExchangePdf = async (pdfPath) => {
  try {
    // Read PDF file as buffer and convert to base64
    const pdfBuffer = await fs.readFile(pdfPath);
    const pdfBase64 = pdfBuffer.toString("base64");

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    let extractedText = "";

    try {
      await page.addScriptTag({
        url: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
      });

      await page.waitForFunction(() => typeof pdfjsLib !== "undefined");

      extractedText = await page.evaluate(async (base64Data) => {
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

          const loadingTask = pdfjsLib.getDocument({ data: atob(base64Data) });
          const pdf = await loadingTask.promise;

          let fullText = "";

          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();

            // Improved text extraction - preserve line structure
            let lastY = null;
            let lineText = "";

            for (const item of textContent.items) {
              if (lastY !== null && Math.abs(lastY - item.transform[5]) > 5) {
                // New line
                fullText += lineText.trim() + "\n";
                lineText = "";
              }
              lineText += item.str + " ";
              lastY = item.transform[5];
            }

            if (lineText.trim()) {
              fullText += lineText.trim() + "\n";
            }
          }

          return fullText;
        } catch (error) {
          console.error("PDF.js parsing error:", error);
          return "";
        }
      }, pdfBase64);

      await browser.close();
    } catch (error) {
      await browser.close();
      throw error;
    }

    if (!extractedText) {
      throw new Error("No text extracted from PDF");
    }

    // Save debug text for analysis
    const debugTextPath = pdfPath.replace(".pdf", "_debug.txt");
    await fs.writeFile(debugTextPath, extractedText);
    console.log(`  📝 Debug text saved: ${debugTextPath}`);

    console.log(`  📄 PDF text length: ${extractedText.length} chars`);

    // Log first 500 chars to see what we're working with
    console.log(`  🔍 First 500 chars: ${extractedText.substring(0, 500)}`);

    return parsePdfText(extractedText, pdfPath);
  } catch (e) {
    console.error(`❌ Failed to parse PDF ${pdfPath}:`, e.message);
    return {
      error: `Failed to parse PDF: ${e.message}`,
      file: pdfPath,
      exchange_rates: [],
    };
  }
};

// Fallback text extraction using system tools
const extractTextWithFallback = async (pdfPath) => {
  const { exec } = await import("child_process");
  const { promisify } = await import("util");
  const execAsync = promisify(exec);

  try {
    // Try pdftotext (common Linux tool)
    const { stdout } = await execAsync(`pdftotext "${pdfPath}" -`);
    return stdout;
  } catch (e) {
    // Try other methods...
    try {
      // Try with strings command
      const { stdout } = await execAsync(`strings "${pdfPath}"`);
      return stdout;
    } catch (e2) {
      throw new Error("No fallback method available");
    }
  }
};

// Parse the extracted PDF text
const parsePdfText = (text, pdfPath) => {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);

  console.log(`  📊 Total lines in PDF: ${lines.length}`);
  console.log(`  🔍 Sample lines:`);
  lines.slice(0, 10).forEach((line, i) => {
    console.log(`     ${i}: ${line}`);
  });

  // 1) Notification number - more flexible pattern
  let notifMatch = null;
  for (const line of lines) {
    notifMatch = line.match(
      /Notification\s*(No\.?|Number)?\s*[:\-]?\s*([0-9]+\/?[0-9]*)/i
    );
    if (notifMatch) break;

    // Alternative pattern
    notifMatch = line.match(/([0-9]+\/[0-9]{4})\s*\/?Customs?/i);
    if (notifMatch) break;
  }

  const notificationNumber = notifMatch
    ? notifMatch[notifMatch.length - 1].trim()
    : "unknown";
  console.log(`  🔍 Notification number: ${notificationNumber}`);

  // 2) Effective date - more flexible patterns
  let effMatch = null;
  const datePatterns = [
    /w\.e\.f\s*[:\s]*(\d{2}-\d{2}-\d{4})/i,
    /effective\s*date[:\s]*(\d{2}-\d{2}-\d{4})/i,
    /Date\s*[:\s]*(\d{2}-\d{2}-\d{4})/i,
    /(\d{2}-\d{2}-\d{4})/, // General date pattern
  ];

  for (const line of lines) {
    for (const pattern of datePatterns) {
      effMatch = line.match(pattern);
      if (effMatch && !line.toLowerCase().includes("notification")) {
        break;
      }
    }
    if (effMatch) break;
  }

  const effectiveDate = effMatch ? effMatch[1] : "unknown";
  console.log(`  📅 Effective date: ${effectiveDate}`);

  // 3) Parse currency exchange rates with multiple strategies
  let exchangeRates = parseCurrencyRatesImproved(lines);

  // If first method fails, try alternative parsing
  if (exchangeRates.length === 0) {
    console.log("  🔧 Trying alternative parsing method...");
    exchangeRates = parseCurrencyRatesAlternative(lines);
  }

  console.log(`  ✅ Successfully parsed ${exchangeRates.length} currencies`);

  return {
    notification_number: notificationNumber,
    effective_date: effectiveDate,
    exchange_rates: exchangeRates,
    meta: {
      parsed_currency_count: exchangeRates.length,
      raw_lines_detected: exchangeRates.length,
      total_lines: lines.length,
    },
  };
};
// Improved currency rate parsing
const parseCurrencyRates = (lines) => {
  const parsed = [];

  // Currency definitions with expected patterns
  const currencies = [
    { code: "USD", name: "US Dollar", patterns: ["US Dollar", "US$", "USD"] },
    { code: "EUR", name: "EURO", patterns: ["EURO", "EUR"] },
    {
      code: "GBP",
      name: "Pound Sterling",
      patterns: ["Pound Sterling", "GBP"],
    },
    {
      code: "JPY",
      name: "Japanese Yen",
      patterns: ["Japanese Yen", "JPY"],
      unit: 100,
    },
    { code: "CHF", name: "Swiss Franc", patterns: ["Swiss Franc", "CHF"] },
    {
      code: "AUD",
      name: "Australian Dollar",
      patterns: ["Australian Dollar", "AUD"],
    },
    {
      code: "CAD",
      name: "Canadian Dollar",
      patterns: ["Canadian Dollar", "CAD"],
    },
    {
      code: "SGD",
      name: "Singapore Dollar",
      patterns: ["Singapore Dollar", "SGD"],
    },
    {
      code: "HKD",
      name: "Hong Kong Dollar",
      patterns: ["Hong Kong Dollar", "HKD"],
    },
    {
      code: "NZD",
      name: "New Zealand Dollar",
      patterns: ["New Zealand Dollar", "NZD"],
    },
    { code: "CNY", name: "Chinese Yuan", patterns: ["Chinese Yuan", "CNY"] },
    {
      code: "KRW",
      name: "Korean won",
      patterns: ["Korean won", "KRW"],
      unit: 100,
    },
    {
      code: "ZAR",
      name: "South African Rand",
      patterns: ["South African Rand", "ZAR"],
    },
    { code: "AED", name: "UAE Dirham", patterns: ["UAE Dirham", "AED"] },
    {
      code: "SAR",
      name: "Saudi Arabian Riyal",
      patterns: ["Saudi Arabian Riyal", "SAR"],
    },
    { code: "QAR", name: "Qatari Riyal", patterns: ["Qatari Riyal", "QAR"] },
    {
      code: "BHD",
      name: "Bahraini Dinar",
      patterns: ["Bahraini Dinar", "BHD"],
    },
    { code: "KWD", name: "Kuwaiti Dinar", patterns: ["Kuwaiti Dinar", "KWD"] },
    { code: "TRY", name: "Turkish Lira", patterns: ["Turkish Lira", "TRY"] },
    { code: "DKK", name: "Danish Kroner", patterns: ["Danish Kroner", "DKK"] },
    {
      code: "NOK",
      name: "Norwegian Kroner",
      patterns: ["Norwegian Kroner", "NOK"],
    },
    {
      code: "SEK",
      name: "Swedish Kroner",
      patterns: ["Swedish Kroner", "SEK"],
    },
  ];

  // Look for currency table - common patterns in ICEGATE PDFs
  let inRatesSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if we're entering the rates section
    if (line.match(/Currency|Exchange|Rate|USD|EUR|GBP/i) && !inRatesSection) {
      inRatesSection = true;
      console.log(`  📈 Entered rates section at line ${i}: ${line}`);
      continue;
    }

    if (!inRatesSection) continue;

    // Try to match currency lines
    for (const currency of currencies) {
      // Check if this line contains the currency pattern
      const hasCurrency = currency.patterns.some((pattern) =>
        new RegExp(pattern.replace(/\s+/g, "\\s*"), "i").test(line)
      );

      if (hasCurrency) {
        console.log(`  💰 Found ${currency.code} at line ${i}: ${line}`);

        // Extract numbers from this line and possibly next line
        const numbers = extractRateNumbers(line);

        // If not enough numbers, check next line
        if (numbers.length < 2 && i + 1 < lines.length) {
          const nextNumbers = extractRateNumbers(lines[i + 1]);
          numbers.push(...nextNumbers);
        }

        if (numbers.length >= 2) {
          const unit = currency.unit || 1.0;
          const importRate = numbers[0];
          const exportRate = numbers[1];

          // Validate reasonable exchange rates
          if (
            importRate > 0.1 &&
            importRate < 1000 &&
            exportRate > 0.1 &&
            exportRate < 1000
          ) {
            parsed.push({
              currency_code: currency.code,
              currency_name: currency.name,
              unit: unit,
              import_rate: importRate,
              export_rate: exportRate,
            });
            console.log(
              `    ✅ ${currency.code}: Import=${importRate}, Export=${exportRate}`
            );
          }
        }
        break;
      }
    }

    // Stop if we've found many currencies or reached end of likely section
    if (parsed.length >= 15 && line.match(/Note|Total|END|Page/i)) {
      break;
    }
  }

  return parsed.sort((a, b) => a.currency_code.localeCompare(b.currency_code));
};

const parseCurrencyRatesImproved = (lines) => {
  const parsed = [];

  // Currency definitions with expected patterns
  const currencies = [
    { code: "USD", name: "US Dollar", patterns: ["US Dollar", "US$", "USD"] },
    { code: "EUR", name: "EURO", patterns: ["EURO", "EUR"] },
    {
      code: "GBP",
      name: "Pound Sterling",
      patterns: ["Pound Sterling", "GBP"],
    },
    {
      code: "JPY",
      name: "Japanese Yen",
      patterns: ["Japanese Yen", "JPY"],
      unit: 100,
    },
    { code: "CHF", name: "Swiss Franc", patterns: ["Swiss Franc", "CHF"] },
    {
      code: "AUD",
      name: "Australian Dollar",
      patterns: ["Australian Dollar", "AUD"],
    },
    {
      code: "CAD",
      name: "Canadian Dollar",
      patterns: ["Canadian Dollar", "CAD"],
    },
    {
      code: "SGD",
      name: "Singapore Dollar",
      patterns: ["Singapore Dollar", "SGD"],
    },
    {
      code: "HKD",
      name: "Hong Kong Dollar",
      patterns: ["Hong Kong Dollar", "HKD"],
    },
    {
      code: "NZD",
      name: "New Zealand Dollar",
      patterns: ["New Zealand Dollar", "NZD"],
    },
    { code: "CNY", name: "Chinese Yuan", patterns: ["Chinese Yuan", "CNY"] },
    {
      code: "KRW",
      name: "Korean won",
      patterns: ["Korean won", "KRW"],
      unit: 100,
    },
    {
      code: "ZAR",
      name: "South African Rand",
      patterns: ["South African Rand", "ZAR"],
    },
    { code: "AED", name: "UAE Dirham", patterns: ["UAE Dirham", "AED"] },
    {
      code: "SAR",
      name: "Saudi Arabian Riyal",
      patterns: ["Saudi Arabian Riyal", "SAR"],
    },
    { code: "QAR", name: "Qatari Riyal", patterns: ["Qatari Riyal", "QAR"] },
    {
      code: "BHD",
      name: "Bahraini Dinar",
      patterns: ["Bahraini Dinar", "BHD"],
    },
    { code: "KWD", name: "Kuwaiti Dinar", patterns: ["Kuwaiti Dinar", "KWD"] },
    { code: "TRY", name: "Turkish Lira", patterns: ["Turkish Lira", "TRY"] },
    { code: "DKK", name: "Danish Kroner", patterns: ["Danish Kroner", "DKK"] },
    {
      code: "NOK",
      name: "Norwegian Kroner",
      patterns: ["Norwegian Kroner", "NOK"],
    },
    {
      code: "SEK",
      name: "Swedish Kroner",
      patterns: ["Swedish Kroner", "SEK"],
    },
  ];

  // Look for currency table - common patterns in ICEGATE PDFs
  let inRatesSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if we're entering the rates section
    if (line.match(/Currency|Exchange|Rate|USD|EUR|GBP/i) && !inRatesSection) {
      inRatesSection = true;
      console.log(`  📈 Entered rates section at line ${i}: ${line}`);
      continue;
    }

    if (!inRatesSection) continue;

    // Try to match currency lines
    for (const currency of currencies) {
      // Check if this line contains the currency pattern
      const hasCurrency = currency.patterns.some((pattern) =>
        new RegExp(pattern.replace(/\s+/g, "\\s*"), "i").test(line)
      );

      if (hasCurrency) {
        console.log(`  💰 Found ${currency.code} at line ${i}: ${line}`);

        // Extract numbers from this line and possibly next line
        const numbers = extractRateNumbers(line);

        // If not enough numbers, check next line
        if (numbers.length < 2 && i + 1 < lines.length) {
          const nextNumbers = extractRateNumbers(lines[i + 1]);
          numbers.push(...nextNumbers);
        }

        if (numbers.length >= 2) {
          const unit = currency.unit || 1.0;
          const importRate = numbers[0];
          const exportRate = numbers[1];

          // Validate reasonable exchange rates
          if (
            importRate > 0.1 &&
            importRate < 1000 &&
            exportRate > 0.1 &&
            exportRate < 1000
          ) {
            parsed.push({
              currency_code: currency.code,
              currency_name: currency.name,
              unit: unit,
              import_rate: importRate,
              export_rate: exportRate,
            });
            console.log(
              `    ✅ ${currency.code}: Import=${importRate}, Export=${exportRate}`
            );
          }
        }
        break;
      }
    }

    // Stop if we've found many currencies or reached end of likely section
    if (parsed.length >= 15 && line.match(/Note|Total|END|Page/i)) {
      break;
    }
  }

  return parsed.sort((a, b) => a.currency_code.localeCompare(b.currency_code));
};

// Extract numbers with context (current line + next line if needed)
const extractNumbersFromContext = (lines, currentIndex, currencyCode) => {
  const numbers = [];

  // Check current line
  const currentLineNumbers = extractNumbersFromLine(lines[currentIndex]);
  numbers.push(...currentLineNumbers);

  // If not enough numbers, check next line
  if (numbers.length < 3 && currentIndex + 1 < lines.length) {
    const nextLineNumbers = extractNumbersFromLine(lines[currentIndex + 1]);
    numbers.push(...nextLineNumbers);
  }

  // Filter and return only the first 3 valid numbers
  return numbers.slice(0, 3);
};

// Improved number extraction
const extractRateNumbers = (line) => {
  // Match numbers with decimal points, excluding obvious non-rate numbers
  const numberMatches = line.match(/\b\d+\.\d{2}\b/g) || [];

  // If no decimal numbers, try integers
  if (numberMatches.length === 0) {
    const intMatches = line.match(/\b\d{2,3}\b/g) || [];
    return intMatches.map(Number).filter((num) => num > 1 && num < 1000);
  }

  return numberMatches.map(Number).filter((num) => {
    // Filter reasonable exchange rate values
    return num > 0.1 && num < 1000;
  });
};

// Helper to exclude date-like numbers
const isDatePattern = (num, line) => {
  // Check if this number is part of a date pattern (dd-mm-yyyy)
  const datePattern = /\d{2}-\d{2}-\d{4}/;
  return datePattern.test(line);
};

// Alternative parsing for tabular data
const parseTabularData = (text) => {
  const parsed = [];
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);

  // Currency name mappings
  const currencyNames = {
    AED: "UAE Dirham",
    AUD: "Australian Dollar",
    BHD: "Bahraini Dinar",
    CAD: "Canadian Dollar",
    CHF: "Swiss Franc",
    CNY: "Chinese Yuan",
    DKK: "Danish Kroner",
    EUR: "EURO",
    GBP: "Pound Sterling",
    HKD: "Hong Kong Dollar",
    JPY: "Japanese Yen",
    KRW: "Korean won",
    KWD: "Kuwaiti Dinar",
    NOK: "Norwegian Kroner",
    NZD: "New Zealand Dollar",
    QAR: "Qatari Riyal",
    SAR: "Saudi Arabian Riyal",
    SEK: "Swedish Kroner",
    SGD: "Singapore Dollar",
    TRY: "Turkish Lira",
    USD: "US Dollar",
    ZAR: "South African Rand",
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Try to match table row pattern: CODE Name number number number
    const rowPattern =
      /^([A-Z]{3})\s+([A-Za-z\s]+?)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)$/;
    const match = line.match(rowPattern);

    if (match) {
      const [, code, name, unit, importRate, exportRate] = match;

      // Use predefined name if available, otherwise use extracted name
      const currencyName = currencyNames[code] || name.trim();

      parsed.push({
        currency_code: code,
        currency_name: currencyName,
        unit: parseFloat(unit),
        import_rate: parseFloat(importRate),
        export_rate: parseFloat(exportRate),
      });
    }
  }

  return parsed;
};

// ====== Main: download and parse ======
const downloadAndParseAll = async (url = URL, outDir = OUT_DIR) => {
  ensureDir(outDir);
  const resultsAll = [];

  console.log("Launching browser...");
  const browser = await chromium.launch({
    headless: true,
    timeout: 60000,
  });
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();
  let savedCount = 0;

  try {
    console.log(`Navigating to ${url} ...`);
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: PAGE_TIMEOUT,
    });

    await page.waitForTimeout(5000);

    try {
      await page.waitForSelector("text=Download PDF", { timeout: 30000 });
    } catch (e) {
      console.warn(
        "Warning: 'Download PDF' did not appear within timeout; proceeding anyway."
      );
    }

    const { notifIdx, dateIdx } = await findHeaderIndices(page);
    console.log(
      `Using notification column index: ${notifIdx}, publish-date column index: ${dateIdx}`
    );

    let rows = await page.$$("table tbody tr");
    if (!rows || rows.length === 0) {
      rows = await page.$$("tbody tr");
    }
    if (!rows || rows.length === 0) {
      rows = await page.$$("tr");
    }
    console.log(`Found ${rows.length} rows to inspect.`);

    if (rows.length === 0) {
      console.log("❌ No rows found in the table.");
      await page.screenshot({ path: "debug-no-rows.png" });
      console.log("   📸 Screenshot saved: debug-no-rows.png");
    }

    for (const [row_i, row] of rows.entries()) {
      const rowNum = row_i + 1;
      try {
        let downloadEl = await row.$("text=Download PDF");
        if (!downloadEl) {
          downloadEl = await row.$(
            "a:has-text('Download PDF'), button:has-text('Download PDF')"
          );
        }

        if (!downloadEl) {
          console.log(`[Row ${rowNum}] No download element found, skipping`);
          continue;
        }

        // read cells
        const cells = await row.$$("td");
        let notifText = null;
        let dateText = null;

        if (cells.length > 0) {
          if (notifIdx < cells.length) {
            try {
              notifText = (await cells[notifIdx].innerText()).trim();
            } catch (e) {}
          }
          if (dateIdx < cells.length) {
            try {
              dateText = (await cells[dateIdx].innerText()).trim();
            } catch (e) {}
          }

          // fallback heuristics
          if (!notifText) {
            for (const c of cells) {
              const t = (await c.innerText()).trim();
              if (t.includes("/") && t.length < 20) {
                notifText = t;
                break;
              }
            }
          }
          if (!dateText) {
            const dateRe = /\d{2}-\d{2}-\d{4}/;
            for (const c of cells) {
              const t = (await c.innerText()).trim();
              const m = t.match(dateRe);
              if (m) {
                dateText = m[0];
                break;
              }
            }
          }
        }

        const notifSafe = sanitizeFilename(notifText || `row${rowNum}`);
        const dateSafe = sanitizeFilename(dateText || "unknown-date");
        const pdfName = `${notifSafe}-${dateSafe}.pdf`;
        let outPath = path.join(outDir, pdfName);

        // avoid overwrite
        let counter = 1;
        const { dir, name: base, ext } = path.parse(outPath);
        while (existsSync(outPath)) {
          outPath = path.join(dir, `${base}_${counter}${ext}`);
          counter++;
        }

        console.log(`[Row ${rowNum}] Clicking to download -> ${outPath}`);

        let download;
        try {
          const downloadPromise = page.waitForEvent("download", {
            timeout: CLICK_TIMEOUT,
          });

          try {
            await downloadEl.scrollIntoViewIfNeeded({ timeout: 2000 });
          } catch (e) {}

          await downloadEl.click({ timeout: CLICK_TIMEOUT });
          download = await downloadPromise;
        } catch (e) {
          console.log(
            ` ⚠️ Timeout or error waiting for download on row ${rowNum}: ${e.message}`
          );
          continue;
        }

        await download.saveAs(outPath);
        console.log(`  ✅ Saved PDF: ${outPath}`);
        savedCount++;

        // parse saved pdf
        console.log("  Parsing PDF ...");
        const parsed = await parseExchangePdf(outPath);

        // save json per pdf
        const jsonPath = path.join(dir, `${path.parse(outPath).name}.json`);
        try {
          await fs.writeFile(
            jsonPath,
            JSON.stringify(parsed, null, 2),
            "utf-8"
          );
          console.log(
            `  ✅ Saved JSON: ${jsonPath} (parsed ${
              parsed.exchange_rates?.length || 0
            } currencies)`
          );
        } catch (e) {
          console.log(`  ⚠️ Failed to write JSON: ${e.message}`);
        }

        resultsAll.push({
          pdf: path.resolve(outPath),
          json: path.resolve(jsonPath),
          parsed: parsed,
        });

        await sleep(SLEEP_BETWEEN);
      } catch (e) {
        console.log(`Skipping row ${rowNum} due to error: ${e.message}`);
        continue;
      }
    }
  } catch (e) {
    console.error("An error occurred during the main process:", e);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }

  // write combined result
  const combinedPath = path.join(outDir, "all_exchange_rates.json");
  try {
    const combined = resultsAll.map((r) => r.parsed);
    await fs.writeFile(
      combinedPath,
      JSON.stringify(combined, null, 2),
      "utf-8"
    );
    console.log(`\n✅ Combined JSON saved: ${combinedPath}`);
  } catch (e) {
    console.log(`\n⚠️ Failed to write combined JSON: ${e.message}`);
  }

  console.log(
    `\nDone. Total PDFs saved: ${savedCount}. Folder: ${path.resolve(outDir)}`
  );
  return resultsAll;
};

// ====== Run the script ======
(async () => {
  const results = await downloadAndParseAll();

  console.log("\n--- Summary ---");
  for (const item of results) {
    const parsed = item.parsed || {};
    const notif = parsed.notification_number || "N/A";
    const eff = parsed.effective_date || "N/A";
    const count = parsed.exchange_rates?.length || 0;
    console.log(
      `Parsed ${count} currencies for Notification ${notif} / Effective ${eff} -> ${item.json}`
    );
  }
})();
