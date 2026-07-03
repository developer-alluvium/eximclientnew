/**
 * E-Way Bill Validation Helpers
 * Centralized validation logic for E-Way Bill form data
 */

/**
 * Validates GSTIN format (15 characters, alphanumeric)
 * @param {string} gstin - GSTIN to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateGSTIN = (gstin) => {
  if (!gstin || gstin.trim() === "") {
    return { isValid: false, error: "GSTIN is required" };
  }

  if (gstin.trim().toUpperCase() === "URP") {
    return { isValid: true, error: "" };
  }

  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstinRegex.test(gstin.toUpperCase())) {
    return { isValid: false, error: "Invalid GSTIN format" };
  }

  return { isValid: true, error: "" };
};

/**
 * Validates pincode format (6 digits for India)
 * @param {string} pincode - Pincode to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validatePincode = (pincode) => {
  if (!pincode || pincode.trim() === "") {
    return { isValid: false, error: "Pincode is required" };
  }

  const pincodeRegex = /^[0-9]{6}$/;
  if (!pincodeRegex.test(pincode)) {
    return { isValid: false, error: "Pincode must be 6 digits" };
  }

  return { isValid: true, error: "" };
};

/**
 * Validates invoice value (must be a positive number)
 * @param {string|number} value - Value to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateInvoiceValue = (value) => {
  if (!value || value === "") {
    return { isValid: false, error: "Invoice value is required" };
  }

  const numValue = parseFloat(value);
  if (isNaN(numValue) || numValue <= 0) {
    return { isValid: false, error: "Invoice value must be a positive number" };
  }

  return { isValid: true, error: "" };
};

/**
 * Validates HSN code format
 * @param {string} hsn - HSN code to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateHSN = (hsn) => {
  if (!hsn || hsn.trim() === "") {
    return { isValid: false, error: "HSN code is required" };
  }

  const hsnRegex = /^[0-9]{6,8}$/;
  if (!hsnRegex.test(hsn)) {
    return { isValid: false, error: "HSN code must be 6-8 digits" };
  }

  return { isValid: true, error: "" };
};

/**
 * Validates required text fields
 * @param {string} value - Value to validate
 * @param {string} fieldName - Name of field for error message
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateRequiredField = (value, fieldName) => {
  if (!value || value.trim() === "") {
    return { isValid: false, error: `${fieldName} is required` };
  }

  return { isValid: true, error: "" };
};

/**
 * Validates distance (must be a positive number)
 * @param {string|number} distance - Distance to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateDistance = (distance) => {
  if (!distance || distance === "") {
    return { isValid: false, error: "Distance is required" };
  }

  const numDistance = parseFloat(distance);
  if (isNaN(numDistance) || numDistance <= 0) {
    return { isValid: false, error: "Distance must be a positive number" };
  }

  return { isValid: true, error: "" };
};

/**
 * Validates transporter ID
 * @param {string} transporterId - Transporter ID to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateTransporterId = (transporterId) => {
  if (!transporterId || transporterId.trim() === "") {
    return { isValid: false, error: "Transporter is required" };
  }

  return { isValid: true, error: "" };
};

/**
 * Validates BE number format
 * @param {string} beNumber - BE number to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateBENumber = (beNumber) => {
  if (!beNumber || beNumber.trim() === "") {
    return { isValid: false, error: "BE number is required" };
  }

  return { isValid: true, error: "" };
};

/**
 * Validates the complete form data for E-Way Bill generation
 * @param {object} formData - Form data to validate
 * @returns {object} - { isValid: boolean, errors: object }
 */
export const validateEwayBillForm = (formData) => {
  const errors = {};

  // Validate consignor GSTIN
  const consignorValidation = validateGSTIN(formData.consignorGSTIN);
  if (!consignorValidation.isValid) {
    errors.consignorGSTIN = consignorValidation.error;
  }

  // Validate consignee GSTIN
  const consigneeValidation = validateGSTIN(formData.consigneeGSTIN);
  if (!consigneeValidation.isValid) {
    errors.consigneeGSTIN = consigneeValidation.error;
  }

  // Validate consignor name
  const consignorNameValidation = validateRequiredField(formData.consignorName, "Consignor name");
  if (!consignorNameValidation.isValid) {
    errors.consignorName = consignorNameValidation.error;
  }

  // Validate consignee name
  const consigneeNameValidation = validateRequiredField(formData.consigneeName, "Consignee name");
  if (!consigneeNameValidation.isValid) {
    errors.consigneeName = consigneeNameValidation.error;
  }

  // Validate invoice value
  const invoiceValueValidation = validateInvoiceValue(formData.invoiceValue);
  if (!invoiceValueValidation.isValid) {
    errors.invoiceValue = invoiceValueValidation.error;
  }

  // Validate HSN
  const hsnValidation = validateHSN(formData.hsn);
  if (!hsnValidation.isValid) {
    errors.hsn = hsnValidation.error;
  }

  // Validate description
  const descriptionValidation = validateRequiredField(formData.description, "Description");
  if (!descriptionValidation.isValid) {
    errors.description = descriptionValidation.error;
  }

  // Validate distance
  const distanceValidation = validateDistance(formData.distance);
  if (!distanceValidation.isValid) {
    errors.distance = distanceValidation.error;
  }

  // Validate transporter ID
  const transporterValidation = validateTransporterId(formData.transporterId);
  if (!transporterValidation.isValid) {
    errors.transporterId = transporterValidation.error;
  }

  // Validate pickup pincode
  const pickupPincodeValidation = validatePincode(formData.pickupPincode);
  if (!pickupPincodeValidation.isValid) {
    errors.pickupPincode = pickupPincodeValidation.error;
  }

  // Validate delivery pincode
  const deliveryPincodeValidation = validatePincode(formData.deliveryPincode);
  if (!deliveryPincodeValidation.isValid) {
    errors.deliveryPincode = deliveryPincodeValidation.error;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
