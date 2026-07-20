import { format, parse, parseISO, isValid } from "date-fns";

/**
 * Formats a date value to dd/MM/yyyy format
 * Handles multiple input formats:
 * - ISO strings (2024-12-31T00:00:00.000Z)
 * - Date strings (2024-12-31, 31/12/2024, 31-12-2024, etc.)
 * - Date objects
 * - Timestamps
 * - String dates in various formats
 *
 * @param {string|Date|number} val - The date value to format
 * @returns {string} - Formatted date string in dd-MM-yyyy format or empty string
 */
export const formatDate = (val, formatStr = "dd-MM-yyyy") => {
  if (!val) return "";

  try {
    const date = parseDate(val);
    if (date && isValid(date)) {
      return format(date, formatStr);
    }

    // Fallback for strings that look like yyyy-MM-dd but failed parsing for some reason
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
      if (formatStr === 'yyyy-MM-dd') return val.trim();
      const parts = val.trim().split('-');
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      if (isValid(d)) return format(d, formatStr);
    }

    return "";
  } catch (e) {
    console.warn("Date formatting error:", e, "for value:", val);
    return "";
  }
};

/**
 * Formats a date value to dd-MM-yyyy HH:mm format
 *
 * @param {string|Date|number} val - The date value to format
 * @returns {string} - Formatted date string in dd-MM-yyyy HH:mm format or empty string
 */
export const formatDateTime = (val) => {
  if (!val) return "";
  const date = parseDate(val);
  return date && isValid(date) ? format(date, "dd-MM-yyyy HH:mm") : "";
};

/**
 * Parses a date string and returns a Date object
 * Handles multiple input formats
 *
 * @param {string|Date|number} val - The date value to parse
 * @returns {Date|null} - Parsed Date object or null if invalid
 */
export const parseDate = (val) => {
  if (!val) return null;

  try {
    let date;

    if (val instanceof Date) {
      return val;
    }

    if (typeof val === "number") {
      date = new Date(val);
      return isValid(date) && date.getFullYear() >= 1000 ? date : null;
    }

    if (typeof val === "string") {
      const trimmedVal = val.trim();
      // Avoid parsing short strings (like "25") which might be interpreted as year 2500
      if (trimmedVal.length < 5) return null;

      // Only parse ISO if it starts with 4 digits (e.g. yyyy-MM-dd)
      if (/^\d{4}/.test(trimmedVal)) {
        date = parseISO(trimmedVal);
      }

      if (!isValid(date) || date.getFullYear() < 1000) {
        const formats = [
          "dd/MM/yyyy HH:mm",
          "dd-MM-yyyy HH:mm",
          "dd.MM.yyyy HH:mm",
          "dd/MM/yyyy HH:mm:ss",
          "dd-MM-yyyy HH:mm:ss",
          "dd/MM/yyyy",
          "dd-MM-yyyy",
          "dd.MM.yyyy",
          "d/M/yyyy",
          "MM/dd/yyyy",
          "M/d/yyyy",
          "yyyy-MM-dd",
          "yyyy/MM/dd",
          "yyyy-MM-dd HH:mm",
          "yyyy-MM-dd HH:mm:ss",
        ];

        for (const dateFormat of formats) {
          try {
            const parsed = parse(trimmedVal, dateFormat, new Date());
            if (isValid(parsed) && parsed.getFullYear() >= 1000) {
              date = parsed;
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }

      if (!isValid(date) || date.getFullYear() < 1000) {
        const parsed = new Date(trimmedVal);
        if (isValid(parsed) && parsed.getFullYear() >= 1000) {
          date = parsed;
        } else {
          date = null;
        }
      }
    }

    return date && isValid(date) && date.getFullYear() >= 1000 ? date : null;
  } catch (e) {
    console.warn("Date parsing error:", e, "for value:", val);
    return null;
  }
};

/**
 * Formats date input on paste or input change
 * Automatically converts any pasted date to dd-MM-yyyy format
 *
 * @param {string} value - The input value
 * @returns {string} - Formatted date string in dd-MM-yyyy format
 */
export const handleDateInput = (value) => {
  if (!value) return "";

  const trimmedValue = value.trim();

  // Handle compact format without separators (e.g., "251225" -> "25-12-2025")
  // Must be exactly 6 digits: ddMMyy
  if (/^\d{6}$/.test(trimmedValue)) {
    const day = trimmedValue.substring(0, 2);
    const month = trimmedValue.substring(2, 4);
    const shortYear = trimmedValue.substring(4, 6);
    // Convert 2-digit year to 4-digit (assume 2000s for years 00-99)
    const fullYear = parseInt(shortYear, 10) >= 0 ? `20${shortYear}` : `19${shortYear}`;

    const dateStr = `${day}-${month}-${fullYear}`;
    const testDate = parse(dateStr, "dd-MM-yyyy", new Date());
    if (isValid(testDate) && testDate.getFullYear() >= 1000) {
      return dateStr;
    }
  }

  // Handle format with separators but 2-digit year (e.g., "25.12.25" or "25-12-25" or "25/12/25")
  const shortYearMatch = trimmedValue.match(/^(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2})$/);
  if (shortYearMatch) {
    const day = shortYearMatch[1].padStart(2, "0");
    const month = shortYearMatch[2].padStart(2, "0");
    const shortYear = shortYearMatch[3];
    // Convert 2-digit year to 4-digit (assume 2000s)
    const fullYear = `20${shortYear}`;

    const dateStr = `${day}-${month}-${fullYear}`;
    const testDate = parse(dateStr, "dd-MM-yyyy", new Date());
    if (isValid(testDate) && testDate.getFullYear() >= 1000) {
      return dateStr;
    }
  }

  // First, try to parse dates with month names (e.g., "31-dec-2025", "31 December 2025")
  // Check if the value contains letters (potential month name)
  if (/[a-zA-Z]/.test(trimmedValue)) {
    try {
      const monthNameFormats = [
        "dd-MMM-yyyy", // 31-dec-2025
        "dd MMM yyyy", // 31 dec 2025
        "dd/MMM/yyyy", // 31/dec/2025
        "dd.MMM.yyyy", // 31.dec.2025
        "dd-MMMM-yyyy", // 31-December-2025
        "dd MMMM yyyy", // 31 December 2025
        "dd/MMMM/yyyy", // 31/December/2025
        "dd.MMMM.yyyy", // 31.December.2025
        "d-MMM-yyyy", // 1-dec-2025
        "d MMM yyyy", // 1 dec 2025
        "MMM dd, yyyy", // Dec 31, 2025
        "MMROTL dd, yyyy", // March fallback
        "MMMM dd, yyyy", // December 31, 2025
      ];

      // Check if the original value had time information (HH:mm)
      const hasTime = /[\s:T](\d{2}:?\d{2})$/i.test(trimmedValue);

      for (const dateFormat of monthNameFormats) {
        try {
          const dts = hasTime ? `${dateFormat} HH:mm` : dateFormat;
          const date = parse(trimmedValue, dts, new Date());
          if (isValid(date) && date.getFullYear() >= 1000) {
            return format(date, hasTime ? "dd-MM-yyyy HH:mm" : "dd-MM-yyyy");
          }
        } catch (e) {
          continue;
        }
      }

      const nativeDate = new Date(trimmedValue);
      if (isValid(nativeDate) && nativeDate.getFullYear() >= 1000) {
        return format(nativeDate, hasTime ? "dd-MM-yyyy HH:mm" : "dd-MM-yyyy");
      }
    } catch (e) {
      console.warn("Date parsing with month name failed:", e);
    }
  }

  // Check if the original value had time information (HH:mm or HHmm)
  const hasTime =
    /[\s:T](\d{2}:?\d{2})$/i.test(trimmedValue) ||
    trimmedValue.toLowerCase().includes("hh");

  const cleanValue = trimmedValue.replace(/[^\d\/\-\.\s:a-zA-Z]/g, "");

  const parsedDate = parseDate(cleanValue);

  if (parsedDate && isValid(parsedDate) && parsedDate.getFullYear() >= 1000) {
    return format(parsedDate, hasTime ? "dd-MM-yyyy HH:mm" : "dd-MM-yyyy");
  }

  return cleanValue;
};

/**
 * Hook for date input fields - handles paste events
 * Use this in your input field's onPaste and onChange handlers
 *
 * @param {Function} setValue - setState function to update the value
 * @returns {Object} - Object with onPaste and onChange handlers
 */
export const useDateInput = (setValue) => {
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const formattedDate = handleDateInput(pastedText);
    setValue(formattedDate);
  };

  const handleChange = (e) => {
    const inputValue = e.target.value;

    // Allow user to type freely, only format when they blur or paste
    // Or format automatically if they've entered a complete date
    if (inputValue.length >= 8) {
      const formattedDate = handleDateInput(inputValue);
      setValue(formattedDate);
    } else {
      setValue(inputValue);
    }
  };

  const handleBlur = (e) => {
    const inputValue = e.target.value;
    if (inputValue) {
      const formattedDate = handleDateInput(inputValue);
      setValue(formattedDate);
    }
  };

  return {
    onPaste: handlePaste,
    onChange: handleChange,
    onBlur: handleBlur,
  };
};

/**
 * Convert date to ISO string for backend
 *
 * @param {string|Date} val - The date value
 * @returns {string} - ISO string or empty string
 */
export const toISOString = (val) => {
  const date = parseDate(val);
  return date ? date.toISOString() : "";
};
