import axios from "axios";
import { getCookie } from "./cookies";

const BOE_API_BASE_URL = process.env.REACT_APP_BOE_API_BASE_URL || "http://3.108.244.38:8002/api/v1";

// Helper to check if a URL is external
const isExternalUrl = (url) => {
  if (!url) return false;
  const isAbsolute = url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//");
  if (!isAbsolute) return false;

  // Check if it starts with the api string
  if (process.env.REACT_APP_API_STRING && url.startsWith(process.env.REACT_APP_API_STRING)) {
    return false;
  }
  // Check if it starts with the current origin
  if (typeof window !== "undefined" && window.location && url.startsWith(window.location.origin)) {
    return false;
  }
  return true;
};

// Axios request interceptor to add access_token from cookies to Authorization header
axios.interceptors.request.use(
  (config) => {
    if (!isExternalUrl(config.url)) {
      const token = getCookie("access_token");
      console.log("Token check:", {
        token,
        typeOfToken: typeof token,
        isTokenNull: token === null,
      });
      // Ensure token is valid and not string "null"/"undefined"
      if (token && token !== "null" && token !== "undefined") {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Add custom header to identify AJAX requests and prevent direct browser access
      config.headers = config.headers || {};
      config.headers["X-Requested-With"] = "XMLHttpRequest";
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// You can add more global axios config here if needed

// Ensure axios sends cookies (HttpOnly or not) with requests
axios.defaults.withCredentials = true;

/**
 * E-Way Bill API endpoints
 */

/**
 * Check if E-Way Bill already exists for a document
 * @param {string} documentNo - BE number
 * @returns {Promise} - Response with existing E-Way Bill data
 */
export const checkEwayBillExists = async (documentNo) => {
  try {
    const response = await axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/list`, {
      params: { documentNo }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch BOE extract data for pre-filling E-Way Bill form
 * @param {string} beNo - BE number
 * @param {string} beDate - BE date (YYYY-MM-DD format)
 * @returns {Promise} - Response with BOE data
 */
export const fetchBoeExtract = async (beNo, beDate) => {
  try {
    const response = await axios.get(`${BOE_API_BASE_URL}/extract-job`, {
      params: { be_no: beNo, be_date: beDate }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch list of transporters
 * @returns {Promise} - Response with transporters list
 */
export const fetchTransporters = async () => {
  try {
    const response = await axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/transporters`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch distance between two pincodes
 * @param {string} pickupPincode - Pickup location pincode
 * @param {string} deliveryPincode - Delivery location pincode
 * @returns {Promise} - Response with distance data
 */
export const fetchDistance = async (pickupPincode, deliveryPincode) => {
  try {
    const response = await axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/distance`, {
      params: { 
        pickup_pincode: pickupPincode, 
        delivery_pincode: deliveryPincode 
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Generate E-Way Bill (Part-A only)
 * @param {object} data - E-Way Bill form data
 * @returns {Promise} - Response with generated E-Way Bill details
 */
export const generateEwayBill = async (data) => {
  try {
    // Ensure transDocNo, transMode, vehicleNo are explicitly omitted/blank for Part-A only
    const payload = {
      ...data,
      transDocNo: "",
      transMode: "",
      vehicleNo: ""
    };

    const response = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/generate`, payload);
    return response.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Fetch existing E-Way Bill details (for viewing)
 * @param {string} ewbNo - E-Way Bill number
 * @returns {Promise} - Response with E-Way Bill details
 */
export const fetchEwayBillDetails = async (ewbNo) => {
  try {
    const response = await axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/${ewbNo}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default axios;
