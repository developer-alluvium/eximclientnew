import axios from "axios";
import { getCookie } from "./cookies";

// Axios request interceptor to add access_token from cookies to Authorization header
axios.interceptors.request.use(
  (config) => {
    const token = getCookie("access_token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// You can add more global axios config here if needed
