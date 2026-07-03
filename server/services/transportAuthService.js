import axios from "axios";

class TransportAuthService {
    constructor() {
        this.cachedToken = null;
        this.baseURL = process.env.NODE_ENV === "development"
            ? "http://localhost:9005/api"
            : "https://eximbot.alvision.in/transport/api";
    }

    async getServiceToken() {
        // If we have a cached token, check its expiry
        if (this.cachedToken) {
            try {
                const payload = JSON.parse(Buffer.from(this.cachedToken.split('.')[1], 'base64').toString('utf8'));
                const now = Math.floor(Date.now() / 1000);
                if (payload.exp && payload.exp > now + 60) { // still valid for at least 1 minute
                    return this.cachedToken;
                }
            } catch (e) {
                this.cachedToken = null;
            }
        }

        // Fetch new token
        try {
            console.log("🔑 Logging into transport API as dev_master to get service token...");
            const username = process.env.TRANSPORT_USERNAME || "dev_master";
            const password = process.env.TRANSPORT_PASSWORD || "1qazxsw2";
            const response = await axios.post(`${this.baseURL}/login`, {
                username,
                password
            }, { timeout: 10000 });

            const token = response.data.exim_token || response.data.user?.token;
            if (!token) {
                throw new Error("No token returned in login response");
            }
            this.cachedToken = token;
            console.log("🔑 Service token retrieved and cached successfully");
            return this.cachedToken;
        } catch (error) {
            console.error("❌ Error fetching transport service token:", error.message);
            if (process.env.NODE_ENV === "development") {
                console.log("⚠️ Fallback to no token in development mode");
                return null;
            }
            throw error;
        }
    }
}

export default new TransportAuthService();
