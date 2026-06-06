import mongoose from "mongoose";
import dotenv from "dotenv";
import EximclientUser from "../models/eximclientUserModel.js";
import { sendUserAuthResponse } from "../middlewares/authMiddleware.js";

// Load environment variables
dotenv.config();

// Mock response object to capture the response or errors
const mockRes = {
  status(code) {
    console.log(`[mockRes] status: ${code}`);
    return this;
  },
  json(data) {
    console.log("[mockRes] json data:", JSON.stringify(data, null, 2));
    return this;
  },
  cookie(name, value, options) {
    console.log(`[mockRes] cookie set: ${name} = ${value.substring(0, 15)}...`);
    return this;
  }
};

async function testLocalLogin() {
  const mongoURI = process.env.PROD_MONGODB_URI;
  if (!mongoURI) {
    console.error("PROD_MONGODB_URI is not defined in .env");
    return;
  }

  console.log("Connecting to production MongoDB...");
  try {
    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB.");

    const email = "tradeops@astonprocessors.com";
    const password = "12345678";

    console.log("Finding user by email:", email);
    const user = await EximclientUser.findOne({
      $or: [
        { email: email.toLowerCase() },
        { ie_code_no: email.toUpperCase() },
      ],
    })
      .select(
        "name email password ie_code_no isAdmin adminId status isActive lastLogin assignedModules role importer assignedImporterName jobsTabVisible gandhidhamTabVisible emailVerified ie_code_assignments exporter_ie_code_assignments documents"
      )
      .populate("adminId", "name ie_code_no");

    if (!user) {
      console.log("User not found!");
      return;
    }

    console.log("User found in database:", {
      id: user._id,
      email: user.email,
      status: user.status,
      role: user.role
    });

    console.log("Comparing password...");
    const isPasswordValid = await user.comparePassword(password);
    console.log("Password valid:", isPasswordValid);

    if (!isPasswordValid) {
      console.log("Password invalid!");
      return;
    }

    console.log("Simulating updating last login timestamp...");
    // We won't actually update the DB here to avoid modifying lastLogin during test, or we can. Let's comment it.
    
    console.log("Calling sendUserAuthResponse...");
    sendUserAuthResponse(user, "user", 200, mockRes, true);
    console.log("sendUserAuthResponse completed successfully!");

  } catch (error) {
    console.error("CRITICAL ERROR ENCOUNTERED IN LOGIN FLOW:");
    console.error(error.stack || error);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed.");
  }
}

testLocalLogin();
