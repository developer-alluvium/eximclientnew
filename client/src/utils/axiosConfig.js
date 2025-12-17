import axios from "axios";
import { getCookie } from "./cookies";

// Axios request interceptor to add access_token from cookies to Authorization header
axios.interceptors.request.use(
  (config) => {
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
    return config;
  },
  (error) => Promise.reject(error)
);

// You can add more global axios config here if needed

// Ensure axios sends cookies (HttpOnly or not) with requests
axios.defaults.withCredentials = true;

export default axios;
