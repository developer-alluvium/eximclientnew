import "./fix-dns.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Import the SuperAdmin model
import SuperAdmin from "./models/superAdminModel.js";

const createSuperAdmin = async () => {
  try {
    // Determine which MongoDB URI to use based on NODE_ENV
    const env = process.env.NODE_ENV || "development";
    let mongoURI;

    switch (env) {
      case "production":
        mongoURI = process.env.PROD_MONGODB_URI;
        break;
      case "server":
        mongoURI = process.env.SERVER_MONGODB_URI;
        break;
      case "development":
      default:
        mongoURI = process.env.DEV_MONGODB_URI;
        break;
    }

    if (!mongoURI) {
      throw new Error(`MongoDB URI not defined for environment: ${env}`);
    }

    // Connect to MongoDB
    await mongoose.connect(mongoURI);
    console.log(`Connected to MongoDB (${env} environment)`);

    // Check if SuperAdmin already exists
    const existingSuperAdmin = await SuperAdmin.findOne();
    if (existingSuperAdmin) {
      console.log("SuperAdmin already exists:", existingSuperAdmin.username);
      return;
    }

    // Create default SuperAdmin
    const defaultUsername = "superadmin";
    const defaultPassword = "1qazXsw@";
    const defaultEmail = "superadmin@exim.com";

    // Hash the password
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    // Create SuperAdmin
    const superAdmin = new SuperAdmin({
      username: defaultUsername,
      password: hashedPassword,
      email: defaultEmail,
      isActive: true,
      role: "superadmin",
      lastLogin: null,
      loginAttempts: 0,
      lockUntil: null,
    });

    await superAdmin.save();

    console.log("✅ SuperAdmin created successfully!");
    console.log("📋 Login Credentials:");
    console.log(`   Username: ${defaultUsername}`);
    console.log(`   Password: ${defaultPassword}`);
    console.log("🔒 Please change the default password after first login.");
    
  } catch (error) {
    console.error("❌ Error creating SuperAdmin:", error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log("Database connection closed");
  }
};

// Run the script
createSuperAdmin();
