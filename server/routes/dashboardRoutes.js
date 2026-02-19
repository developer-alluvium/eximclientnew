import express from "express";
import {
  getDashboardAnalytics,
  getUserActivity,
  getSystemMetrics,
  getHistoricalAnalytics,
  getClientEngagement,
  getJobsBreakdown,
} from "../controllers/dashboardController.js";
import { protectSuperAdmin } from "../controllers/superAdminController.js";

const router = express.Router();

// Dashboard routes (all protected by SuperAdmin authentication)
router.get("/api/dashboard/analytics", protectSuperAdmin, getDashboardAnalytics);
router.get("/api/dashboard/user-activity", protectSuperAdmin, getUserActivity);
router.get("/api/dashboard/system-metrics", protectSuperAdmin, getSystemMetrics);
router.get("/api/dashboard/historical", protectSuperAdmin, getHistoricalAnalytics);
router.get("/api/dashboard/client-engagement", protectSuperAdmin, getClientEngagement);
router.get("/api/dashboard/jobs-breakdown", protectSuperAdmin, getJobsBreakdown);

export default router;