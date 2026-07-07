import "./fix-dns.js";
import dns from "dns";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import axios from "axios";
import connectDB from "./config/db.js";
import config from "./config/env.js";
import customerRoutes from "./routes/customerRoutes.js";
import deliveryRoutes from "./routes/deliveryRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import superAdminRoutes from "./routes/superAdminRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import moduleRoutes from "./routes/moduleRoutes.js";

import userRoutes from "./routes/userRoutes.js";
import userProfileRoutes from "./routes/userProfileRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

import userManagementRoutes from "./routes/userManagementRoutes.js";
import superAdminIeCodeRoutes from "./routes/superAdminIeCodeRoutes.js";
import aeoIntegrationRoutes from "./routes/aeoIntegrationRoutes.js";
import aeoReminderRoutes from "./routes/aeoReminderRoutes.js";
import analytics from "./routes/analytics.js";

import elockRoutes from "./routes/elockRoutes.js";
import elockDetailsRoutes from "./routes/elockDetailsRoutes.js";

import icegateProxy from "./routes/icegateProxy.js";

//currency rate routes
import currencyRate from "./routes/currencyRate.js";
import transportRoutes from "./routes/transportRoutes.js"; // Transport module routes
import exportProxyRoutes from "./routes/exportProxyRoutes.js"; // Export module proxy routes
import importProxyRoutes from "./routes/importProxyRoutes.js"; // Import module proxy routes
import openPointsRoutes from "./routes/openPointsRoutes.js";
import transportAuthService from "./services/transportAuthService.js";
import "./services/reminderService.js";
// Load environment variables
dotenv.config();


// Initialize Express app

const app = express();
const PORT = config.port;

// When running behind a proxy (e.g., nginx, load balancer), enable trust proxy
if (config.nodeEnv === "production" || process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: false }));
app.use(cookieParser());

// CORS configuration
// Build allowed origins list using configured client URLs (env) and common dev hosts
const defaultOrigins = [
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3000",
  "http://client.exim.alvision.in.s3-website.ap-south-1.amazonaws.com",
  "https://client.alvision.in",
  "https://eximbot.alvision.in",
  /^https:\/\/.*\.ngrok-free\.app$/
];

const allowedOrigins = [
  config.client.development,
  config.client.server,
  config.client.production,
  ...defaultOrigins,
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cache-Control",
      "user-id",
      "user-role",
      "x-username",
      "username",
      "X-Requested-With",
      "Access-Control-Allow-Origin",
    ],
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
app.use(customerRoutes);
app.use(deliveryRoutes);
app.use(analyticsRoutes);
app.use(superAdminRoutes);
app.use(dashboardRoutes);
app.use(moduleRoutes);

app.use(userProfileRoutes);
app.use(uploadRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api/user-management", userManagementRoutes);
app.use("/api/superadmin", superAdminIeCodeRoutes);
app.use(aeoIntegrationRoutes);
app.use(aeoReminderRoutes);
app.use(icegateProxy);
app.use(currencyRate);
app.use("/api/transport", transportRoutes);
app.use(exportProxyRoutes); // Export module proxy routes
app.use(importProxyRoutes); // Import module proxy routes
app.use(analytics);
app.use(openPointsRoutes); // Open Points routes

app.use("/api/elock", elockRoutes);
app.use("/api/elock-details", elockDetailsRoutes);

// Proxy route for third-party notifications
app.get("/api/notifications", async (req, res) => {
  try {
    const { assetIds } = req.query;
    if (!assetIds) {
      return res.status(400).json({ success: false, message: "assetIds param is required" });
    }
    const serviceToken = await transportAuthService.getServiceToken();

    const targetBaseUrl = process.env.NODE_ENV === "development"
        ? "http://localhost:9005/api"
        : "https://eximbot.alvision.in/transport/api";

    const response = await axios.get(
      `${targetBaseUrl}/notifications`, {
      params: { assetIds },
      headers: {
        ...(serviceToken && { Authorization: `Bearer ${serviceToken}` }),
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error proxying notifications:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: "Failed to fetch notifications from third-party service" });
  }
});

// SSE endpoint for notifications
app.get("/api/notifications/stream", (req, res) => {
  const { assetIds } = req.query;
  if (!assetIds) {
    return res.status(400).json({ success: false, message: "assetIds param is required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders && res.flushHeaders();
  
  // Establish connection immediately
  res.write(': connected\n\n');

  let previousState = new Set();
  let isFirstFetch = true;

  const fetchAndPush = async () => {
    try {
      const serviceToken = await transportAuthService.getServiceToken();
      const targetBaseUrl = process.env.NODE_ENV === "development"
          ? "http://localhost:9005/api"
          : "https://eximbot.alvision.in/transport/api";

      const response = await axios.get(`${targetBaseUrl}/notifications`, {
        params: { assetIds },
        headers: {
          ...(serviceToken && { Authorization: `Bearer ${serviceToken}` }),
        }
      });
      
      const responseData = response.data;
      const dataArray = Array.isArray(responseData) ? responseData : (responseData.data || responseData.notifications || []);
      
      if (isFirstFetch) {
        dataArray.forEach(notif => {
          const title = notif.components?.title || notif.title || "";
          const timeStr = notif.components?.time || notif.createdAt;
          previousState.add(`${title}_${timeStr}`);
        });
        isFirstFetch = false;
        // Initial fetch complete, clients can start receiving new pushes
      } else {
        const newNotifications = [];
        dataArray.forEach(notif => {
          const title = notif.components?.title || notif.title || "";
          const timeStr = notif.components?.time || notif.createdAt;
          const key = `${title}_${timeStr}`;
          
          if (!previousState.has(key)) {
            previousState.add(key);
            newNotifications.push(notif);
          }
        });

        if (newNotifications.length > 0) {
          res.write(`data: ${JSON.stringify({ type: 'new', data: newNotifications })}\n\n`);
        } else {
          // Sent heartbeat every tick to test connection
          res.write(': heartbeat\n\n');
        }
      }
    } catch (error) {
      console.error("SSE fetch error:", error.message);
    }
  };

  fetchAndPush();
  const interval = setInterval(fetchAndPush, 30000);

  req.on("close", () => {
    clearInterval(interval);
  });
});

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
