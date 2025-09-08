import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import config from "./config/env.js";
import jobRoutes from "./routes/jobRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import deliveryRoutes from "./routes/deliveryRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import superAdminRoutes from "./routes/superAdminRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import moduleRoutes from "./routes/moduleRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import userProfileRoutes from "./routes/userProfileRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import customerAdminRoutes from "./routes/customerAdminRoutes.js";
import userManagementRoutes from "./routes/userManagementRoutes.js";
import superAdminIeCodeRoutes from "./routes/superAdminIeCodeRoutes.js";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = config.port;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// CORS configuration
app.use(
  cors({
    origin: [
      "http://localhost:3001",
      "http://43.205.59.159",
      "http://client.exim.alvision.in.s3-website.ap-south-1.amazonaws.com",
      "http://elock-tracking.s3-website.ap-south-1.amazonaws.com",
      "http://localhost:3005",
      "http://eximdev.s3-website.ap-south-1.amazonaws.com"
    ], // Your React app's URL
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", 'user-id',
        'username',
        'user-role',
        'x-username'],
  })
);

// app.use(
//   cors({
//     origin: "*", // Allow all origins
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   })
// );

// Connect to MongoDB
connectDB()
  .then(() => {
    console.log(`Environment: ${config.nodeEnv}`);
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });

// Routes
app.use(jobRoutes);
app.use(customerRoutes);
app.use(deliveryRoutes);
app.use(analyticsRoutes);
app.use(superAdminRoutes);
app.use(dashboardRoutes);
app.use(moduleRoutes);
app.use(activityRoutes);
app.use(userProfileRoutes)
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/customer-admin", customerAdminRoutes);
app.use("/api/user-management", userManagementRoutes);
app.use("/api/superadmin", superAdminIeCodeRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("Hello - API is running");
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    port: PORT,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Server Error",
    error: process.env.NODE_ENV === "production" ? {} : err.stack,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
