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
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public / User authenticated telemetry routes (soft auth check so telemetry never crashes client if token missing)
const optionalAuth = (req, res, next) => {
  authenticate(req, res, () => {
    next();
  }).catch(() => next());
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
