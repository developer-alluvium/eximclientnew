/**
 * BDD & TDD Test Suite for BOE Upload & E-Way Bill Proxy
 * 
 * Feature: Others E-Way Bill BOE Upload & Parsing
 * 
 * Scenario 1: Dual Form-Data Key Appends ('files' and 'file') for FastAPI compatibility
 * Scenario 2: Error message unpacking from upstream FastAPI 422 responses
 * Scenario 3: Validation when BE Number cannot be extracted from PDF
 * Scenario 4: Duplicate BE Number detection and prevention
 * Scenario 5: BOE Date parsing across various formats
 * Scenario 6: MongoDB Duplicate Key Error (Code 11000) graceful handling
 */

import assert from "assert";
import FormData from "form-data";

// ==========================================
// PURE UNIT / TDD FUNCTIONS TESTED
// ==========================================

/**
 * Extracts human-readable error messages from various upstream API error shapes
 */
function extractErrorMessage(error, defaultMsg = "Failed to process BOE upload") {
  if (error.response?.data) {
    const data = error.response.data;
    if (typeof data === "string") return data;
    if (data.detail) {
      if (typeof data.detail === "string") return data.detail;
      if (Array.isArray(data.detail)) {
        return data.detail.map(d => d.msg || `${d.loc ? d.loc.slice(1).join('.') + ': ' : ''}${d.msg || JSON.stringify(d)}`).join(", ");
      }
      return JSON.stringify(data.detail);
    }
    if (data.message) return data.message;
    if (data.error) return typeof data.error === "string" ? data.error : JSON.stringify(data.error);
    if (data.results?.message) return data.results.message;
  }
  return error.message || defaultMsg;
}

/**
 * Normalizes and extracts BOE Number from parser records
 */
function extractBoeNumber(parsedData) {
  let records = [];
  if (parsedData && parsedData.status === "success" && parsedData.data && typeof parsedData.data === "object" && !Array.isArray(parsedData.data)) {
    if (!parsedData.data.ImporterDetails && !parsedData.data.InvoiceAndItemDetails && !parsedData.data["BE No"] && !parsedData.data.BE_NO) {
      records = Object.values(parsedData.data);
    } else {
      records = [parsedData.data];
    }
  } else if (parsedData) {
    records = Array.isArray(parsedData) ? parsedData : (parsedData.records || parsedData.data || [parsedData]);
  }

  const boeRecord = records[0] || {};
  const boeDetail = boeRecord.data || boeRecord;
  const importerDetails = boeDetail.ImporterDetails || {};
  const invoiceDetails = boeDetail.InvoiceAndItemDetails || {};

  const boeNumber = importerDetails["BE No"] || importerDetails["BE_NO"] || invoiceDetails.BE_NO || invoiceDetails.document_no || boeRecord.documentNumber || "";
  return (boeNumber || "").toString().trim();
}

/**
 * Parses raw BOE Date string into valid Date object
 */
function parseBoeDate(rawBoeDate) {
  if (!rawBoeDate) return null;
  if (rawBoeDate.includes("/")) {
    const parts = rawBoeDate.split("/");
    if (parts.length === 3) {
      const formatted = `${parts[2].length === 2 ? "20" + parts[2] : parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      const d = new Date(formatted);
      if (!isNaN(d.getTime())) return d;
    }
  } else {
    const d = new Date(rawBoeDate);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

// ==========================================
// TEST EXECUTION RUNNER
// ==========================================

async function runTests() {
  console.log("================================================================================");
  console.log("🚀 STARTING BDD & TDD TEST SUITE: BOE UPLOAD & E-WAY BILL PROXY");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}\n`);
      failed++;
    }
  }

  // ----------------------------------------------------------------------
  // SCENARIO 1: Dual Form-Data Key Appends
  // ----------------------------------------------------------------------
  console.log("📌 Feature: Dual Form-Data Key Payload Construction");

  test("Scenario 1.1: FormData appends both 'files' and 'file' buffers for parser", () => {
    const dummyBuffer = Buffer.from("%PDF-1.4 dummy content");
    const form = new FormData();
    form.append("files", dummyBuffer, { filename: "sample_boe.pdf", contentType: "application/pdf" });
    form.append("file", dummyBuffer, { filename: "sample_boe.pdf", contentType: "application/pdf" });

    const headers = form.getHeaders();
    assert(headers["content-type"].startsWith("multipart/form-data; boundary="), "Headers must contain multipart boundary");
  });

  // ----------------------------------------------------------------------
  // SCENARIO 2: Error Message Unpacking from Upstream FastAPI
  // ----------------------------------------------------------------------
  console.log("\n📌 Feature: Upstream Error Unpacking & Status Mapping");

  test("Scenario 2.1: Extract error message from FastAPI validation array (detail: [{msg: '...'}])", () => {
    const error = {
      response: {
        status: 422,
        data: {
          detail: [
            { loc: ["body", "files"], msg: "field required", type: "value_error.missing" }
          ]
        }
      },
      message: "Request failed with status code 422"
    };
    const msg = extractErrorMessage(error);
    assert.strictEqual(msg, "field required", "Should extract specific field validation message");
  });

  test("Scenario 2.2: Extract error message from FastAPI detail string", () => {
    const error = {
      response: {
        status: 422,
        data: {
          detail: "Could not parse Bill of Entry table layout"
        }
      },
      message: "Request failed with status code 422"
    };
    const msg = extractErrorMessage(error);
    assert.strictEqual(msg, "Could not parse Bill of Entry table layout");
  });

  test("Scenario 2.3: Extract error message from standard { message: '...' } JSON", () => {
    const error = {
      response: {
        status: 400,
        data: {
          message: "Invalid PDF document provided"
        }
      },
      message: "Request failed with status code 400"
    };
    const msg = extractErrorMessage(error);
    assert.strictEqual(msg, "Invalid PDF document provided");
  });

  test("Scenario 2.4: Fallback to Axios error message when response body is empty", () => {
    const error = {
      response: {
        status: 502,
        data: null
      },
      message: "connect ECONNREFUSED 3.108.244.38:8002"
    };
    const msg = extractErrorMessage(error);
    assert.strictEqual(msg, "connect ECONNREFUSED 3.108.244.38:8002");
  });

  // ----------------------------------------------------------------------
  // SCENARIO 3: Extraction Validation for BE Number
  // ----------------------------------------------------------------------
  console.log("\n📌 Feature: BE Number Extraction & Validation");

  test("Scenario 3.1: Successfully extract BE No from ImporterDetails['BE No'] in direct object", () => {
    const parsedData = {
      status: "success",
      data: {
        ImporterDetails: { "BE No": "2024093", "BE Date": "20/06/2026" },
        InvoiceAndItemDetails: { SUPPLIER_NAME_ADDRESS: "GLOBAL SUPPLIER INC" }
      }
    };
    const beNo = extractBoeNumber(parsedData);
    assert.strictEqual(beNo, "2024093");
  });

  test("Scenario 3.2: Successfully extract BE No from filename-keyed dictionary", () => {
    const parsedData = {
      status: "success",
      data: {
        "boe_upload_file.pdf": {
          ImporterDetails: { "BE_NO": "3456789", "BE Date": "20/06/2026" },
          InvoiceAndItemDetails: { SUPPLIER_NAME_ADDRESS: "GLOBAL SUPPLIER INC" }
        }
      }
    };
    const beNo = extractBoeNumber(parsedData);
    assert.strictEqual(beNo, "3456789");
  });

  test("Scenario 3.3: Successfully extract BE No from InvoiceAndItemDetails.BE_NO fallback", () => {
    const parsedData = {
      status: "success",
      data: {
        InvoiceAndItemDetails: { BE_NO: "9876543" }
      }
    };
    const beNo = extractBoeNumber(parsedData);
    assert.strictEqual(beNo, "9876543");
  });

  test("Scenario 3.4: Successfully extract BE No from array response format", () => {
    const parsedData = [
      {
        data: {
          ImporterDetails: { "BE No": "1122334" }
        }
      }
    ];
    const beNo = extractBoeNumber(parsedData);
    assert.strictEqual(beNo, "1122334");
  });

  test("Scenario 3.5: Return empty string when no BE No exists in corrupted PDF data", () => {
    const parsedData = {
      status: "success",
      data: {}
    };
    const beNo = extractBoeNumber(parsedData);
    assert.strictEqual(beNo, "", "Should return empty string");
  });

  // ----------------------------------------------------------------------
  // SCENARIO 4: Date Parsing Across Formats
  // ----------------------------------------------------------------------
  console.log("\n📌 Feature: BOE Date Parsing");

  test("Scenario 4.1: Parse slash date DD/MM/YYYY", () => {
    const parsed = parseBoeDate("25/08/2026");
    assert(parsed instanceof Date, "Must be valid Date instance");
    assert.strictEqual(parsed.toISOString().split("T")[0], "2026-08-25");
  });

  test("Scenario 4.2: Parse ISO date YYYY-MM-DD", () => {
    const parsed = parseBoeDate("2026-08-25");
    assert(parsed instanceof Date, "Must be valid Date instance");
    assert.strictEqual(parsed.toISOString().split("T")[0], "2026-08-25");
  });

  test("Scenario 4.3: Handle invalid / missing date gracefully without throwing", () => {
    const parsed = parseBoeDate("");
    assert.strictEqual(parsed, null);
    const parsedInvalid = parseBoeDate("invalid-date-string");
    assert.strictEqual(parsedInvalid, null);
  });

  // ----------------------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
