import CustomerKycModel from '../models/customerKycModel.js';

/**
 * Validates a single IE code assignment
 * @param {string} ieCodeNo - IE code number to validate
 * @returns {Promise<{isValid: boolean, customerKyc: Object|null, error: string|null}>}
 */
export const validateIeCode = async (ieCodeNo) => {
  try {
    if (!ieCodeNo) {
      return {
        isValid: false,
        customerKyc: null,
        error: 'IE code is required.'
      };
    }

    // Convert to uppercase for consistency
    const ieCodeUpper = ieCodeNo.toUpperCase();

    // Check if IE code exists in CustomerKyc
    const customerKyc = await CustomerKycModel.findOne({ iec_no: ieCodeUpper });
    if (!customerKyc) {
      return {
        isValid: false,
        customerKyc: null,
        error: `No customer KYC record found with IEC number ${ieCodeUpper}.`
      };
    }

    if (!customerKyc.name_of_individual) {
      return {
        isValid: false,
        customerKyc: null,
        error: `Customer KYC record found but name_of_individual is missing for IEC ${ieCodeUpper}.`
      };
    }

    return {
      isValid: true,
      customerKyc,
      error: null
    };
  } catch (error) {
    console.error('IE code validation error:', error);
    return {
      isValid: false,
      customerKyc: null,
      error: 'Internal server error while validating IE code.'
    };
  }
};

/**
 * Validates multiple IE code assignments
 * @param {string[]} ieCodes - Array of IE code numbers to validate
 * @returns {Promise<{isValid: boolean, validCodes: Array, invalidCodes: Array, error: string|null}>}
 */
export const validateMultipleIeCodes = async (ieCodes) => {
  try {
    if (!Array.isArray(ieCodes)) {
      return {
        isValid: false,
        validCodes: [],
        invalidCodes: [],
        error: 'ieCodes must be an array.'
      };
    }

    const results = await Promise.all(ieCodes.map(ieCode => validateIeCode(ieCode)));
    const validCodes = [];
    const invalidCodes = [];

    results.forEach((result, index) => {
      if (result.isValid) {
        validCodes.push({
          ieCodeNo: ieCodes[index],
          customerKyc: result.customerKyc
        });
      } else {
        invalidCodes.push({
          ieCodeNo: ieCodes[index],
          error: result.error
        });
      }
    });

    return {
      isValid: invalidCodes.length === 0,
      validCodes,
      invalidCodes,
      error: invalidCodes.length > 0 ? 'Some IE codes are invalid.' : null
    };
  } catch (error) {
    console.error('Multiple IE code validation error:', error);
    return {
      isValid: false,
      validCodes: [],
      invalidCodes: [],
      error: 'Internal server error while validating IE codes.'
    };
  }
};

/**
 * Checks if an admin has permission to assign a specific IE code
 * @param {Object} actor - The admin or superadmin user
 * @param {string} ieCodeNo - The IE code to check
 * @returns {{isAllowed: boolean, error: string|null}}
 */
export const checkIeCodeAssignmentPermission = (actor, ieCodeNo) => {
  // SuperAdmin can assign any IE code
  if (actor.role === 'superadmin') {
    return { isAllowed: true, error: null };
  }

  // Admins can only assign their own IE code
  if (actor.role === 'admin' && actor.ie_code_no !== ieCodeNo) {
    return {
      isAllowed: false,
      error: 'Admins can only assign their own IE Code to users.'
    };
  }

  return { isAllowed: true, error: null };
};
