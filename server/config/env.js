// config/env.mjs
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

/**
 * Environment configuration with validation
 */
const config = {
  // Node environment
  nodeEnv: process.env.NODE_ENV || "development",

  // Server configuration
  port: process.env.PORT || 9003,

  // MongoDB URIs
  mongodb: {
    development: process.env.DEV_MONGODB_URI,
    server: process.env.SERVER_MONGODB_URI,
    production: process.env.PROD_MONGODB_URI,
  },

  //* Client URIs
  client: {
    development: process.env.DEV_CLIENT_URI,
    server: process.env.SERVER_CLIENT_URI,
    production: process.env.PROD_CLIENT_URI,
  },

  //* AWS credentials
  aws: {
    accessKey: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },

  //* JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expiration: process.env.JWT_EXPIRATION || "7d",
  },

  //* Validate essential configuration
  validate() {
    const environment = this.nodeEnv;
    const requiredVars = [this.mongodb[environment], this.jwt.secret];

    const missing = requiredVars.filter((v) => !v);

    if (missing.length > 0) {
      console.warn(
        "Missing required environment variables for the current environment"
      );
      return false;
    }
    return true;
  },
};

export default config;
