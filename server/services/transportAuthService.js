import axios from "axios";

class TransportAuthService {
    constructor() {
        this.baseURL = process.env.NODE_ENV === "development"
            ? "http://localhost:9007/api"
            : "https://eximbot.alvision.in/transport/api";

        // Configure axios request interceptor to automatically add the x-api-key header
        axios.interceptors.request.use(
            (config) => {
                const isUpstream = (config.url && config.url.startsWith(this.baseURL)) ||
                                   (config.baseURL && config.baseURL.startsWith(this.baseURL));
                if (isUpstream) {
                    config.headers = config.headers || {};
                    config.headers["x-api-key"] = process.env.YOUR_SHARED_API_KEY_HERE;
                    delete config.headers.Authorization;
                    delete config.headers.authorization;
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
