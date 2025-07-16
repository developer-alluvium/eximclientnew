import axios from 'axios';

// Axios request interceptor to add access_token from localStorage to Authorization header
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// You can add more global axios config here if needed