import axios from "axios";

class TransportAuthService {
    constructor() {
        this.baseURL = process.env.NODE_ENV === "development"
            ? "http://localhost:9007/api"
            : "https://eximbot.alvision.in/transport/api";

        // Configure axios request interceptor to automatically add the x-api-key header
        axios.interceptors.request.use(
            (config) => {
                const targetUrl = config.url || "";
                const targetBaseUrl = config.baseURL || "";
                
                // Identify if request goes to the transport API (development or production)
                const isTransportApi = 
                    targetUrl.includes("eximbot.alvision.in") || 
                    targetUrl.includes("localhost:9007") ||
                    targetBaseUrl.includes("eximbot.alvision.in") || 
                    targetBaseUrl.includes("localhost:9007");

                if (isTransportApi) {
                    config.headers = config.headers || {};

                    // Axios 1.x Hotfix: Use .set() if available, otherwise fallback
                    if (typeof config.headers.set === 'function') {
                        config.headers.set("x-api-key", process.env.YOUR_SHARED_API_KEY_HERE);
                        config.headers.delete("Authorization");
                        config.headers.delete("authorization");
                    } else {
                        config.headers["x-api-key"] = process.env.YOUR_SHARED_API_KEY_HERE;
                        delete config.headers.Authorization;
                        delete config.headers.authorization;
                    }
                }
                return config;
            },
            (error) => Promise.reject(error)
        );
    }

    async getServiceToken() {
        // Return empty string to prevent breaking existing code that calls this method
        return "";
    }
}

export default new TransportAuthService();
