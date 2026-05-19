import express from "express";
import { getAvailableExporters, proxyExportListing } from "../controllers/exportProxyController.js";
import { protectSuperAdmin } from "../controllers/superAdminController.js";
import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * GET /api/superadmin/available-exporters
 * Fetches exporters + IEC codes from the Export API's Directory.
 * SuperAdmin-only — used in Admin Management to populate the exporter dropdown.
 */
router.get("/api/superadmin/available-exporters", protectSuperAdmin, getAvailableExporters);

/**
 * GET /api/exports/:status
 * Proxied export job listing from the Exim-Export server.
 * Automatically injects the logged-in user's IE code assignments as a filter.
 * Accessible to any authenticated user who has the /export module assigned.
 */
router.get("/api/exports/:status", authenticateUser, proxyExportListing);

export default router;
