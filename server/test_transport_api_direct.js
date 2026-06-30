import axios from "axios";

async function run() {
    const baseURL = "http://localhost:9007/api";
    
    // Step 1: Login
    let serviceToken = null;
    try {
        console.log("🔑 Logging into transport API...");
        const loginResponse = await axios.post(`${baseURL}/login`, {
            username: "dev_master",
            password: "1qazxsw2"
        }, { timeout: 10000 });
        
        serviceToken = loginResponse.data.exim_token || loginResponse.data.user?.token;
        console.log("🔑 Login success. Token:", serviceToken ? "FOUND" : "NOT FOUND", serviceToken);
    } catch (err) {
        console.error("❌ Login failed:", err.message);
        if (err.response) {
            console.error("Login status:", err.response.status, err.response.data);
        }
    }

    // Step 2: Query client transport data
    try {
        const url = `${baseURL}/client-Transport-data`;
        console.log(`\nGET ${url}`);
        const response = await axios.get(url, {
            params: { ieCodeNo: "AAHCB5082B", filter: "active" },
            headers: {
                ...(serviceToken && { Authorization: `Bearer ${serviceToken}` }),
            },
            timeout: 10000
        });
        console.log("-> SUCCESS!", response.status, response.data);
    } catch (err) {
        console.error("-> FAILED! Error:", err.message);
        if (err.response) {
            console.error("   Status:", err.response.status);
            console.error("   Data:", JSON.stringify(err.response.data, null, 2));
        }
    }
}

run();
