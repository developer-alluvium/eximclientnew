import axios from "axios";
import { getCookie } from "./cookies";

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

export default axios;
