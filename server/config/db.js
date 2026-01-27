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
    process.exit(1);
  }
};

export default connectDB;
