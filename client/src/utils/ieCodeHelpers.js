// Helper functions for handling multiple IE codes

/**
 * Get all IE codes assigned to the logged-in user
 * @returns {Array} Array of IE code objects with ie_code_no and importer_name
 */
import { getJsonCookie } from "./cookies";

export const getUserIeCodes = () => {
  try {
    const user = getJsonCookie("exim_user");
    return user?.ie_code_assignments || [];
  } catch (error) {
    console.error("Error getting user IE codes:", error);
    return [];
  }
};

/**
 * Get primary/first IE code assigned to the user
 * @returns {String|null} Primary IE code number or null
 */
export const getPrimaryIeCode = () => {
  try {
    const user = getJsonCookie("exim_user");
    return (
      user?.primary_ie_code ||
      user?.ie_code_assignments?.[0]?.ie_code_no ||
      null
    );
  } catch (error) {
    console.error("Error getting primary IE code:", error);
    return null;
  }
};

/**
 * Get all IE code numbers assigned to the user
 * @returns {Array} Array of IE code numbers
 */
export const getIeCodeNumbers = () => {
  try {
    const ieCodes = getUserIeCodes();
    return ieCodes.map((ic) => ic.ie_code_no);
  } catch (error) {
    console.error("Error getting IE code numbers:", error);
    return [];
  }
};

/**
 * Get importer name for a specific IE code
 * @param {String} ieCode - IE code number
 * @returns {String} Importer name or 'Unknown'
 */
export const getImporterNameByIeCode = (ieCode) => {
  try {
    const ieCodes = getUserIeCodes();
    return (
      ieCodes.find((ic) => ic.ie_code_no === ieCode)?.importer_name || "Unknown"
    );
  } catch (error) {
    console.error("Error getting importer name:", error);
    return "Unknown";
  }
};
