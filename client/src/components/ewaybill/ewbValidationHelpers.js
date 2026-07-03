/**
 * EWB Frontend Validation Helpers
 * Client-side mirrors of the backend ewbValidationService.
 * Run these before submitting to catch obvious errors early,
 * without the round-trip cost to the server.
 *
 * Each function returns: string | null (error message or null if valid)
 */

// ─── 1. Distance ±10% ────────────────────────────────────────────────────────
/**
 * @param {number} autoKm        - Auto-calculated distance
 * @param {number} manualKm      - User-entered override
 * @param {string} subSupplyType - "Import" / "Export" bypass the check
 * @returns {string | null}
 */
export function validateDistanceClient(autoKm, manualKm, subSupplyType) {
  const subType = (subSupplyType || "").toLowerCase();
  if (subType === "import" || subType === "export") return null;
  if (!autoKm || !manualKm) return null;

  const auto = parseFloat(autoKm);
  const manual = parseFloat(manualKm);
  if (isNaN(auto) || isNaN(manual) || auto <= 0) return null;

  const lower = auto * 0.9;
  const upper = auto * 1.1;

  if (manual < lower || manual > upper) {
    return `Distance override (${manual} km) must be within ±10% of the auto-calculated distance (${auto} km). Allowed range: ${Math.floor(lower)}–${Math.ceil(upper)} km.`;
  }
  return null;
}

// ─── 2. HSN Codes ─────────────────────────────────────────────────────────────
/**
 * @param {Array}   items           - Array of { hsnCode, productName }
 * @param {boolean} higherTurnover  - true → min 6 digits required
 * @returns {string[]}              - Array of error messages (empty = valid)
 */
export function validateHsnCodesClient(items, higherTurnover = false) {
  const errors = [];
  if (!Array.isArray(items) || items.length === 0) {
    return ["At least one item with an HSN code is required."];
  }

  const minDigits = higherTurnover ? 6 : 4;

  const allSac = items.every((item) =>
    String(item.hsnCode || "").trim().startsWith("99")
  );
  if (allSac) {
    errors.push(
      "Cannot generate EWB with only Service (SAC) codes (99xxxx). At least one Goods HSN code is required."
    );
  }

  items.forEach((item, idx) => {
    const hsn = String(item.hsnCode || "").trim();
    if (!hsn) {
      errors.push(`Item ${idx + 1}: HSN code is required.`);
    } else if (hsn.length < minDigits) {
      errors.push(
        `Item ${idx + 1} (HSN: ${hsn}): Minimum ${minDigits} digits required${higherTurnover ? " for taxpayers with turnover ≥ ₹5 Crores" : ""}.`
      );
    }
  });
  return errors;
}

// ─── 3. Transport Mode (Ship → ODC) ──────────────────────────────────────────
/**
 * @param {string|number} mode           - "1"=Road "2"=Rail "3"=Air "4"=Ship
 * @param {string}        vehicleNo
 * @param {string}        vehicleType    - "r"=Regular "o"=ODC
 * @param {string}        docNo
 * @param {string}        docDate
 * @returns {string[]}
 */
export function validateTransportModeClient(mode, vehicleNo, vehicleType, docNo, docDate) {
  const errors = [];
  if (String(mode) !== "4") return errors;

  if (vehicleType !== "o" && vehicleType !== "ODC") {
    errors.push(
      "Ship / Road-cum-Ship transport requires Vehicle Type to be ODC. Regular vehicles are not permitted."
    );
  }

  const hasVehicle = vehicleNo && vehicleNo.trim().length > 0;
  const hasDocPair = docNo?.trim() && docDate?.trim();

  if (!hasVehicle && !hasDocPair) {
    errors.push(
      "For Ship transport: provide either a Vehicle Number OR both a Transporter Document Number and Document Date."
    );
  }
  return errors;
}

// ─── 4. Vehicle Number Format ──────────────────────────────────────────────
/**
 * Validates the format of an Indian vehicle number (Normal or Temporary).
 * Format: StateCode(2) + DistrictCode(2) + Series(0-3) + Number(4)
 * OR: TM + 6 alphanumeric (Temporary)
 *
 * @param {string} vehicleNo
 * @returns {string | null}
 */
export function validateVehicleNumber(vehicleNo) {
  if (!vehicleNo) return null;
  const vn = vehicleNo.trim().toUpperCase();

  // Temporary Vehicle
  if (vn.startsWith("TM")) {
    const tmRegex = /^TM[A-Z0-9]{6}$/;
    if (!tmRegex.test(vn)) {
      return `Temporary vehicle "${vn}" is invalid. Format: TM + 6 characters (e.g., TM123456).`;
    }
    return null;
  }

  // Normal Vehicle
  // Regex: State(2) + Num(1-2) + Series(0-3) + Num(4)
  const normalRegex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/;
  if (!normalRegex.test(vn)) {
    return `Vehicle number "${vn}" is invalid. Enter a valid Indian format (e.g., GJ01AB1234).`;
  }

  // State Code Validation
  const stateCodes = [
    "AN", "AP", "AR", "AS", "BR", "CH", "CT", "DN", "DD", "DL", "GA", "GJ", "HR", "HP", "JK", "JH", "KA", "KL", "LD", "MP", "MH", "MN", "ML", "MZ", "NL", "OR", "PY", "PB", "RJ", "SK", "TN", "TG", "TR", "UP", "UT", "WB", "LA"
  ];
  const state = vn.substring(0, 2);
  if (!stateCodes.includes(state)) {
    return `Invalid state code "${state}" in vehicle number. Use a valid Indian state code (e.g., GJ, MH, DL).`;
  }

  return null;
}

// ─── 5. Temporary Vehicle Format (DEPRECATED: Use validateVehicleNumber) ─────
/**
 * @param {string} vehicleNo
 * @returns {string | null}
 */
export function validateTempVehicleClient(vehicleNo) {
  return validateVehicleNumber(vehicleNo);
}

// ─── 5. Rail Document Format ──────────────────────────────────────────────────
/**
 * @param {string|number} mode  - transport mode
 * @param {string}        docNo
 * @returns {string | null}
 */
export function validateRailDocumentClient(mode, docNo) {
  if (String(mode) !== "2") return null;

  if (!docNo || docNo.trim().length === 0) {
    return "Railway RR/PWB Number is required for Rail transport. Format: P<station><number> (PMS) or F<station><number> (FOIS).";
  }

  const doc = docNo.trim().toUpperCase();
  const pms  = /^P[A-Z]{2,7}[0-9]+$/;
  const fois = /^F[A-Z]{2,7}[0-9]+$/;

  if (!pms.test(doc) && !fois.test(doc)) {
    return `Railway document "${doc}" is invalid. Use PMS format P<station><number> (e.g., PNDLS123456) or FOIS format F<station><number> (e.g., FNDLS123456).`;
  }
  return null;
}

// ─── 6. SEZ Detection (informational) ────────────────────────────────────────
/**
 * Returns true if GSTIN belongs to an SEZ unit (6th character = 'Z').
 * Used to show an info banner in the UI and auto-set the state field.
 *
 * @param {string} gstin
 * @returns {boolean}
 */
export function isSezGstin(gstin) {
  if (!gstin || gstin.toUpperCase() === "URP") return false;
  const g = gstin.trim().toUpperCase();
  return g.length >= 15 && g[5] === "Z";
}

// ─── 7. Cancellation time window ─────────────────────────────────────────────
/**
 * @param {Date|string} generatedAt
 * @returns {{ withinWindow: boolean, hoursElapsed: number }}
 */
export function checkCancellationWindow(generatedAt) {
  if (!generatedAt) return { withinWindow: true, hoursElapsed: 0 };
  const hoursElapsed = (Date.now() - new Date(generatedAt).getTime()) / 3_600_000;
  return { withinWindow: hoursElapsed <= 24, hoursElapsed };
}

// ─── 8. Rejection time window ────────────────────────────────────────────────
/**
 * @param {Date|string} generatedAt
 * @returns {{ withinWindow: boolean, hoursElapsed: number }}
 */
export function checkRejectionWindow(generatedAt) {
  if (!generatedAt) return { withinWindow: true, hoursElapsed: 0 };
  const hoursElapsed = (Date.now() - new Date(generatedAt).getTime()) / 3_600_000;
  return { withinWindow: hoursElapsed <= 72, hoursElapsed };
}

// ─── Master pre-submit checker ────────────────────────────────────────────────
/**
 * Run all client-side validations before submitting the generation form.
 * Returns { valid: boolean, errors: [{field, message}] }
 *
 * @param {Object} formData
 * @param {number} autoCalculatedKm  - 0 if not yet fetched
 */
export function runClientSideValidations(formData, autoCalculatedKm = 0) {
  const errors = [];

  // Distance
  const distErr = validateDistanceClient(
    autoCalculatedKm,
    formData.transportDistance,
    formData.subSupplyType
  );
  if (distErr) errors.push({ field: "transportDistance", message: distErr });

  // HSN
  const hsnErrors = validateHsnCodesClient(
    formData.items || [],
    formData.higherTurnover === true
  );
  hsnErrors.forEach((msg) => errors.push({ field: "items", message: msg }));

  // Transport mode, vehicle, and rail validations (skipped for Part A Only)
  if (!formData.partAOnly) {
    const modeErrors = validateTransportModeClient(
      formData.transportationMode,
      formData.vehicleNo,
      formData.vehicleType,
      formData.transporterDocNo,
      formData.transporterDocDate
    );
    modeErrors.forEach((msg) => errors.push({ field: "vehicleType", message: msg }));

    // Vehicle Number Format
    const vnErr = validateVehicleNumber(formData.vehicleNo);
    if (vnErr) errors.push({ field: "vehicleNo", message: vnErr });

    // Rail document
    const railErr = validateRailDocumentClient(
      formData.transportationMode,
      formData.transporterDocNo
    );
    if (railErr) errors.push({ field: "transporterDocNo", message: railErr });
  }

  // State-PIN combinations (TC-EWB-VAL-04 / NEG-03)
  const consignorStatePinErr = validateStatePin(formData.consignorState, formData.consignorPincode);
  if (consignorStatePinErr) errors.push({ field: "consignorPincode", message: consignorStatePinErr });

  const dispatchStatePinErr = validateStatePin(formData.dispatchFromState, formData.dispatchFromPincode);
  if (dispatchStatePinErr) errors.push({ field: "dispatchFromPincode", message: dispatchStatePinErr });

  const consigneeStatePinErr = validateStatePin(formData.consigneeState, formData.consigneePincode);
  if (consigneeStatePinErr) errors.push({ field: "consigneePincode", message: consigneeStatePinErr });

  const shipToStatePinErr = validateStatePin(formData.shipToState, formData.shipToPincode);
  if (shipToStatePinErr) errors.push({ field: "shipToPincode", message: shipToStatePinErr });

  return { valid: errors.length === 0, errors };
}

// ─── 9. State-PIN Mapping & Validation (TC-EWB-VAL-04 / NEG-03) ────────────────
const STATE_PIN_PREFIX_MAP = {
  "andhra pradesh": ["51", "52", "53"],
  "arunachal pradesh": ["79"],
  "assam": ["78"],
  "bihar": ["80", "81", "82", "83", "84", "85"],
  "chhattisgarh": ["49"],
  "goa": ["40"],
  "gujarat": ["36", "37", "38", "39"],
  "haryana": ["12", "13"],
  "himachal pradesh": ["17"],
  "jammu and kashmir": ["18", "19"],
  "jharkhand": ["81", "82", "83"],
  "karnataka": ["56", "57", "58", "59"],
  "kerala": ["67", "68", "69"],
  "madhya pradesh": ["45", "46", "47", "48"],
  "maharashtra": ["40", "41", "42", "43", "44"],
  "manipur": ["79"],
  "meghalaya": ["79"],
  "mizoram": ["79"],
  "nagaland": ["79"],
  "odisha": ["75", "76", "77"],
  "punjab": ["14", "15"],
  "rajasthan": ["30", "31", "32", "33", "34"],
  "sikkim": ["73"],
  "tamil nadu": ["60", "61", "62", "63", "64"],
  "telangana": ["50"],
  "tripura": ["79"],
  "uttar pradesh": ["20", "21", "22", "23", "24", "25", "26", "27", "28"],
  "uttarakhand": ["24", "26"],
  "west bengal": ["70", "71", "72", "73", "74"],
  "andaman and nicobar islands": ["74"],
  "chandigarh": ["16"],
  "dadra and nagar haveli and daman and diu": ["39"],
  "delhi": ["11"],
  "ladakh": ["18", "19"],
  "lakshadweep": ["68"],
  "puducherry": ["60", "67", "69"]
};

export function validateStatePin(state, pincode) {
  if (!state || !pincode) return null;
  const pinStr = String(pincode).trim();
  const stateStr = String(state).trim().toLowerCase();

  // If pincode is "999999" (imports/exports standard), bypass this check
  if (pinStr === "999999") return null;

  if (!/^\d{6}$/.test(pinStr)) {
    return "Pincode must be a 6-digit number.";
  }

  const prefixes = STATE_PIN_PREFIX_MAP[stateStr];
  if (!prefixes) return null; // If state is not in mapping, don't block

  const matched = prefixes.some(pref => pinStr.startsWith(pref));
  if (!matched) {
    return `Pincode mismatch for the selected State. Pincode should start with one of: ${prefixes.join(', ')}.`;
  }

  return null;
}

// ─── 10. GSTIN / Transporter ID Format Validation (TC-TRA-02) ──────────────────
export function validateGstinFormat(gstin) {
  if (!gstin) return null;
  const clean = gstin.trim().toUpperCase();
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z0-9]{1}[Zz][A-Z0-9]{1}$/;
  if (!regex.test(clean)) {
    return "Invalid GSTIN / Transporter ID format (15 characters alphanumeric, e.g., 24ANGPR7652E1ZV).";
  }
  return null;
}

// ─── 11. Parse DD/MM/YYYY HH:MM:SS AM/PM E-Way Bill Date ────────────────────────
export function parseEwbDate(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [_, day, month, year] = match;
    const t = s.match(/(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)/i);
    if (t) {
      let h = parseInt(t[1]);
      if (t[4].toUpperCase() === "PM" && h !== 12) h += 12;
      if (t[4].toUpperCase() === "AM" && h === 12) h = 0;
      return new Date(year, month - 1, day, h, parseInt(t[2] || 0), parseInt(t[3] || 0));
    }
    return new Date(year, month - 1, day, 23, 59, 59); // End of day fallback
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// ─── 12. Validity Extension Window (TC-EXT-02 / TC-EXT-03) ─────────────────────
export function checkExtensionWindow(validUpto) {
  const now = new Date();
  const validDate = parseEwbDate(validUpto);
  if (!validDate) return { withinWindow: false, error: "Invalid date" };
  const diff = (validDate - now) / (1000 * 60 * 60);
  return { withinWindow: Math.abs(diff) <= 8, hoursUntilExpiry: diff, isExpired: diff < 0 };
}

