import express from "express";
import {
  sendHeartbeat,
  logActivityEvents,
  getMonitoringAnalytics,
  getUserActivitySummary,
  getUserDetailedTimeline,
  getLiveClickStream,
} from "../controllers/userActivityController.js";
import { protectSuperAdmin } from "../controllers/superAdminController.js";
import jwt from "jsonwebtoken";
import EximclientUser from "../models/eximclientUserModel.js";
import SuperAdminModel from "../models/superAdminModel.js";

const router = express.Router();

// Public / User authenticated telemetry routes (soft auth check so telemetry never crashes client if token missing)
const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    if (req.headers.authorization) {
      if (req.headers.authorization.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
      } else {
        token = req.headers.authorization;
      }
    } else if (req.cookies) {
      token =
        req.cookies.access_token ||
        req.cookies.user_access_token ||
        req.cookies.customer_admin_access_token ||
        req.cookies.superadmin_token;
    }

    if (token && token !== "null" && token !== "undefined") {
      const secret =
        process.env.JWT_SECRET ||
        process.env.JWT_ACCESS_SECRET ||
        "your-secret-key";
      const decoded = jwt.verify(token, secret);

      let user = null;
      let userType = decoded.role || decoded.userType;

      if (userType === "superadmin") {
        user = await SuperAdminModel.findById(decoded.id);
      }
      if (!user) {
        user = await EximclientUser.findById(decoded.id);
        if (user) {
          userType = user.role === "admin" ? "admin" : "user";
        }
      }

      if (user) {
        req.user = {
          id: user._id,
          _id: user._id,
          name: user.name,
          email: user.email,
          role: userType || user.role || "user",
          primary_ie_code: user.ie_code_no || decoded.primary_ie_code || "",
          ie_code_no: user.ie_code_no || decoded.ie_code_no || "",
        };
      }
    }
  } catch (err) {
    // Non-blocking telemetry auth
  }
  next();
};

// Heartbeat endpoint
router.post("/api/activity/heartbeat", optionalAuth, sendHeartbeat);

// Log click & page navigation events
router.post("/api/activity/log-events", optionalAuth, logActivityEvents);

// --- Super Admin Monitoring Endpoints (Protected) ---
router.get(
  "/api/superadmin/monitoring/analytics",
  protectSuperAdmin,
  getMonitoringAnalytics
);

router.get(
  "/api/superadmin/monitoring/users",
  protectSuperAdmin,
  getUserActivitySummary
);

router.get(
  "/api/superadmin/monitoring/user/:userId/timeline",
  protectSuperAdmin,
  getUserDetailedTimeline
);

router.get(
  "/api/superadmin/monitoring/events",
  protectSuperAdmin,
  getLiveClickStream
);

export default router;
