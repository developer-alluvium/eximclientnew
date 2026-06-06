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

    const superadmins = await SuperAdminModel.find({});
    console.log(`Found ${superadmins.length} superadmins:`);
    console.log("--------------------------------------------------");
    superadmins.forEach(sa => {
      console.log(`Username: ${sa.username}`);
      console.log(`Email: ${sa.email}`);
      console.log(`Role: superadmin`);
      console.log("--------------------------------------------------");
    });

    const users = await EximclientUser.find({}).populate("adminId", "name email role");
    console.log(`Found ${users.length} users/admins in EximclientUser:`);
    console.log("--------------------------------------------------");
    users.forEach(user => {
      console.log(`Name: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`Status: ${user.status}`);
      console.log(`AdminId: ${user.adminId ? `${user.adminId.name} (${user.adminId.email})` : 'None'}`);
      console.log("--------------------------------------------------");
    });

    process.exit(0);
  } catch (error) {
    console.error("Error running script:", error);
    process.exit(1);
  }
};

run();
