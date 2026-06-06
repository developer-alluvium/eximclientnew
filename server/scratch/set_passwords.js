import mongoose from "mongoose";
import dotenv from "dotenv";
import EximclientUser from "../models/eximclientUserModel.js";
import SuperAdminModel from "../models/superAdminModel.js";

dotenv.config();

const run = async () => {
  try {
    const mongoUri = process.env.DEV_MONGODB_URI || "mongodb://localhost:27017/exim";
    console.log("Connecting to:", mongoUri);
    await mongoose.connect(mongoUri);
    console.log("Connected successfully.\n");

    // Update SuperAdmin password
    const sa = await SuperAdminModel.findOne({ email: "superadmin@exim.com" });
    if (sa) {
      sa.password = "password123";
      await sa.save();
      console.log("Successfully reset SuperAdmin password to 'password123'.");
    } else {
      console.log("SuperAdmin not found.");
    }

    // Update Sojith password
    const adminUser = await EximclientUser.findOne({ email: "sojith@surajforwarders.com" });
    if (adminUser) {
      adminUser.password = "password123";
      await adminUser.save();
      console.log("Successfully reset Sojith (Admin) password to 'password123'.");
    } else {
      console.log("Sojith (Admin) not found.");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error running script:", error);
    process.exit(1);
  }
};

run();
