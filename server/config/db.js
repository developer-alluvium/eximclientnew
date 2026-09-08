// config/db.mjs
import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

/**
 * Connect to the appropriate MongoDB database based on the current environment
 */
const connectDB = async () => {
  try {
    // Determine which MongoDB URI to use based on NODE_ENV with fallback
    const env = process.env.NODE_ENV || "development";
    let mongoURI =
      (env === "production" && process.env.PROD_MONGODB_URI) ||
      (env === "server" && process.env.SERVER_MONGODB_URI) ||
      (env === "development" && process.env.DEV_MONGODB_URI) ||
      process.env.PROD_MONGODB_URI ||
      process.env.SERVER_MONGODB_URI ||
      process.env.DEV_MONGODB_URI ||
      "mongodb+srv://exim:I9y5bcMUHkGHpgq2@exim.xya3qh0.mongodb.net/exim";

    if (!mongoURI) {
      console.warn(`[MongoDB Warning] No URI found for environment: ${env}`);
      return null;
    }

    // Connection options (can be tuned via environment variables)
    const mongooseOptions = {
      appName: process.env.MONGOOSE_APP_NAME || "EximServer",
      minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE, 10) || 0,
      maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE, 10) || 30,
      maxIdleTimeMS: parseInt(process.env.DB_MAX_IDLE_MS, 10) || 30000,
      serverSelectionTimeoutMS:
        parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT_MS, 10) || 5000,
      socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT_MS, 10) || 45000,
    };

    // Connect to MongoDB with provided options
    console.log(`🔌 [eximclientnew] Connecting to MongoDB URI (env: ${env}):`, mongoURI);
    const conn = await mongoose.connect(mongoURI, mongooseOptions);

    console.log("MongoDB Connected", {
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      options: {
        minPoolSize: mongooseOptions.minPoolSize,
        maxPoolSize: mongooseOptions.maxPoolSize,
        maxIdleTimeMS: mongooseOptions.maxIdleTimeMS,
      },
    });
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    return null;
  }
};

export default connectDB;
