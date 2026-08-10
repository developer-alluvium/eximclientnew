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
                
                // Identify if request goes specifically to the transport API (development or production)
                const isTransportApi = 
                    targetUrl.includes("eximbot.alvision.in/transport") || 
                    targetUrl.includes("localhost:9007") ||
                    targetBaseUrl.includes("eximbot.alvision.in/transport") || 
                    targetBaseUrl.includes("localhost:9007");

                if (isTransportApi) {
                    config.headers = config.headers || {};
                    const apiKey = process.env.TRANSPORT_API_KEY || "1234567890";

                    if (typeof config.headers.set === 'function') {
                        config.headers.set("x-api-key", apiKey);
                    } else {
                        config.headers["x-api-key"] = apiKey;
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
