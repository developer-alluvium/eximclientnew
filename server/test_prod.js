import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import axios from "axios";

// Load env from current directory
dotenv.config();

const MONGODB_URI = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/exim";
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

const userSchema = new mongoose.Schema({}, { strict: false });
const EximclientUser = mongoose.model("EximclientUser", userSchema, "eximclientusers");

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        const user = await EximclientUser.findOne({ email: "punit@alluvium.in" });
        
        const payload = {
            id: user._id.toString(),
            email: user.get("email"),
            name: user.get("name"),
            userType: "user",
            role: "user",
            isAdmin: user.get("isAdmin"),
            ie_code_no: user.get("ie_code_no"),
            status: user.get("status"),
            adminId: user.get("adminId")?.toString()
        };

        const token = jwt.sign(payload, JWT_SECRET, {
            expiresIn: "12h",
            algorithm: "HS256"
        });

        const urls = [
            "http://localhost:9005/api/client-elock-assign",
        ];

        for (const url of urls) {
            console.log(`\nTESTING URL: ${url}`);
            try {
                const response = await axios.get(url, {
                    params: { page: 1, limit: 10, status: "All Status" },
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    timeout: 8000
                });
                console.log("-> Test SUCCESS!", response.status);
            } catch (err) {
                console.log("-> Test FAILED! Error:", err.message);
                if (err.response) {
                    console.log("   Status:", err.response.status);
                    console.log("   Data:", err.response.data);
                }
            }
        }
    } catch (err) {
        console.error("Run error:", err);
    } finally {
        await mongoose.connection.close();
    }
}
run();
