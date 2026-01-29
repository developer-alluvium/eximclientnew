import express from "express";
import { getPerKgCostAnalytics, getBestSuppliersByHsCode } from "../controllers/analytics.js";
import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Analytics routes
router.get("/api/analytics/per-kg-cost", authenticateUser, getPerKgCostAnalytics);
router.get("/api/analytics/best-suppliers", authenticateUser, getBestSuppliersByHsCode);

export default router;
