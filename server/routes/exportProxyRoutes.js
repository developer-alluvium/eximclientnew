import express from "express";
import axios from "axios";
import { getAvailableExporters, proxyExportListing, proxyExportFilterOptions, proxyExportTabCounts, proxyExporterBranches } from "../controllers/exportProxyController.js";
import { protectSuperAdmin } from "../controllers/superAdminController.js";
import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

const EXPORT_API_BASE_URL = process.env.EXPORT_API_BASE_URL || "http://localhost:9002/api";

/**
 * GET /api/superadmin/available-exporters
 * Fetches exporters + IEC codes from the Export API's Directory.
 * SuperAdmin-only — used in Admin Management to populate the exporter dropdown.
 */
router.get("/api/superadmin/available-exporters", protectSuperAdmin, getAvailableExporters);
router.get("/api/superadmin/exporter-branches", protectSuperAdmin, proxyExporterBranches);

/**
 * GET /api/exports/:status
 * Proxied export job listing from the Exim-Export server.
 * Automatically injects the logged-in user's IE code assignments as a filter.
 * Accessible to any authenticated user who has the /export module assigned.
 */
router.get("/api/exports/filter-options", authenticateUser, proxyExportFilterOptions);
router.get("/api/exports/tab-counts", authenticateUser, proxyExportTabCounts);
router.get("/api/exports/:status", authenticateUser, proxyExportListing);

/**
 * POST /api/client-queries
 * Proxies to Exim-Export server.
 * Injects logged-in user's email, name, and username as client details.
 */
router.post("/api/client-queries", authenticateUser, async (req, res) => {
  try {
    const { job_no, subject, message, job_id, client_id, client_name } = req.body;
    
    // Auto-inject client info from req.user
    const payload = {
      job_no,
      job_id,
      client_id: client_id || req.user.ie_code_no || req.user.email,
      client_name: client_name || req.user.name || "Client",
      client_email: req.user.email,
      client_username: req.user.name || req.user.email,
      subject,
      message,
    };

    const response = await axios.post(`${EXPORT_API_BASE_URL}/client-queries`, payload);
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error("Create client query proxy error:", error);
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ success: false, message: "Proxy error creating client query" });
  }
});

/**
 * GET /api/client-queries
 * Proxies to Exim-Export server.
 */
router.get("/api/client-queries", authenticateUser, async (req, res) => {
  try {
    const response = await axios.get(`${EXPORT_API_BASE_URL}/client-queries`, {
      params: req.query
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error("Get client queries proxy error:", error);
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ success: false, message: "Proxy error fetching client queries" });
  }
});

/**
 * POST /api/client-queries/jobs-status
 * Proxies status check to Exim-Export server.
 */
router.post("/api/client-queries/jobs-status", authenticateUser, async (req, res) => {
  try {
    const response = await axios.post(`${EXPORT_API_BASE_URL}/client-queries/jobs-status`, req.body);
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error("Client queries jobs-status proxy error:", error);
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ success: false, message: "Proxy error fetching client query statuses" });
  }
});

/**
 * PUT /api/client-queries/mark-seen
 * Proxies marking client queries as seen.
 */
router.put("/api/client-queries/mark-seen", authenticateUser, async (req, res) => {
  try {
    const response = await axios.put(`${EXPORT_API_BASE_URL}/client-queries/mark-seen`, req.body);
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error("Client queries mark-seen proxy error:", error);
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ success: false, message: "Proxy error marking client queries as seen" });
  }
});

/**
 * GET /api/client-queries/:id
 * Proxies to Exim-Export server.
 */
router.get("/api/client-queries/:id", authenticateUser, async (req, res) => {
  try {
    const response = await axios.get(`${EXPORT_API_BASE_URL}/client-queries/${req.params.id}`);
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error("Get client query details proxy error:", error);
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ success: false, message: "Proxy error fetching client query details" });
  }
});

/**
 * PUT /api/client-queries/:id/reply
 * Proxies to Exim-Export server.
 * Injects logged-in user's email/username.
 */
router.put("/api/client-queries/:id/reply", authenticateUser, async (req, res) => {
  try {
    const { message, repliedBy, senderType } = req.body;
    const payload = {
      message,
      repliedBy: repliedBy || req.user.name || "Client",
      senderType: senderType || "client",
      email: req.user.email,
      username: req.user.name || req.user.email,
    };

    const response = await axios.put(`${EXPORT_API_BASE_URL}/client-queries/${req.params.id}/reply`, payload);
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error("Reply to client query proxy error:", error);
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ success: false, message: "Proxy error replying to client query" });
  }
});

/**
 * PUT /api/client-queries/:id/resolve
 * Proxies to Exim-Export server.
 */
router.put("/api/client-queries/:id/resolve", authenticateUser, async (req, res) => {
  try {
    const response = await axios.put(`${EXPORT_API_BASE_URL}/client-queries/${req.params.id}/resolve`, req.body);
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error("Resolve client query proxy error:", error);
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ success: false, message: "Proxy error resolving client query" });
  }
});

export default router;
