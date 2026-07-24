import express from "express";
import axios from "axios";
import multer from "multer";
import FormData from "form-data";
import elockApiService from "../services/elockApiService.js";
import { authenticateUser } from "../middlewares/authMiddleware.js";
import EximclientUser from "../models/eximclientUserModel.js";
import transportAuthService from "../services/transportAuthService.js";

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// Apply authentication to all routes
router.use(authenticateUser);

/**
 * GET /assignments
 * Get E-Lock assignments with complete data mapping
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 100)
 * - search: Search term
 * - status: Filter by status (ASSIGNED, UNASSIGNED, RETURNED)
 * - filterType: Filter type (consignor, consignee)
 */
router.get("/assignments", async (req, res) => {
    try {
        console.log("📨 Assignment request received with query:", req.query);

        // Get IE Code from authenticated user session
        let ieCodeNo = req.query.ieCodeNo;

        if (req.userType === 'user') {
            // For standard users, validate against their assigned IE codes
            const userIeCodes = req.user.ie_code_assignments?.map(a => a.ie_code_no) || [];
            
            if (userIeCodes.length === 1) {
                // Single IE code - use it regardless of query param
                ieCodeNo = userIeCodes[0];
                console.log(`🔐 User has single IE code: ${ieCodeNo}`);
            } else if (userIeCodes.length > 1) {
                // Multiple IE codes - validate query param or use first
                if (ieCodeNo && userIeCodes.includes(ieCodeNo)) {
                    console.log(`🔐 User selected IE code: ${ieCodeNo} (validated against assigned codes)`);
                } else {
                    // Query param not provided or not in user's assigned codes - use first
                    ieCodeNo = userIeCodes[0];
                    console.log(`🔐 Using first assigned IE code for user: ${ieCodeNo}`);
                }
            } else {
                // Fallback to primary IE code if available
                ieCodeNo = req.user.ie_code_no;
                console.log(`🔐 Using primary IE code: ${ieCodeNo}`);
            }
        }

        const queryParams = {
            ...req.query,
            ieCodeNo: ieCodeNo
        };

        // Extract authToken from Authorization header or cookies
        let authToken = req.headers.authorization;
        if (!authToken) {
            const cookieToken = req.cookies?.access_token || req.cookies?.user_access_token || req.cookies?.customer_admin_access_token;
            if (cookieToken) {
                authToken = `Bearer ${cookieToken}`;
            }
        }

        // Pass query parameters to the service method
        const result = await elockApiService.getElockAssignments(queryParams, authToken);

        // Always return 200 — the success/error status is in the response body
        console.log(
            `✅ Assignment response sent with ${result.data?.length || 0} records (success: ${result.success})`
        );
        res.status(200).json(result);
    } catch (error) {
        console.error("❌ Error in assignments endpoint:", error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            message: "Failed to fetch assignments"
        });
    }
});

/**
 * GET /assignments/:id
 * Get detailed assignment information by ID
 */
router.get("/assignments/:id", async (req, res) => {
    try {
        const { id } = req.params;
        console.log("📨 Assignment detail request for ID:", id);

        // Extract authToken from Authorization header or cookies
        let authToken = req.headers.authorization;
        if (!authToken) {
            const cookieToken = req.cookies?.access_token || req.cookies?.user_access_token || req.cookies?.customer_admin_access_token;
            if (cookieToken) {
                authToken = `Bearer ${cookieToken}`;
            }
        }

        const result = await elockApiService.getAssignmentById(id, authToken);

        const statusCode = result.success ? 200 : 404;

        console.log(`✅ Assignment detail response sent for ID: ${id}`);
        res.status(statusCode).json(result);
    } catch (error) {
        console.error("❌ Error in assignment detail endpoint:", error.message);

        res.status(500).json({
            success: false,
            error: error.message,
            message: "Failed to fetch assignment details",
            assignmentId: req.params.id,
        });
    }
});

/**
 * GET /asset-info/:assetId
 * Proxy to QueryAdminAssetByAssetId
 */
router.get("/asset-info/:assetId", async (req, res) => {
    try {
        const { assetId } = req.params;
        const result = await elockApiService.getAssetInfo(assetId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /track-history
 * Proxy to QueryLBSTrackListByFGUID
 */
router.post("/track-history", async (req, res) => {
    try {
        const result = await elockApiService.getTrackHistory(req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /location/:assetId
 * Get asset location using iCloud Assets Controls LBS API
 */
router.get("/location/:assetId", async (req, res) => {
    try {
        const { assetId } = req.params;
        const { type = 2 } = req.query; // Default to type 2 as used in tracking map
        console.log("📨 Location request for asset:", assetId, "type:", type);

        const result = await elockApiService.getAssetLocation(assetId, parseInt(type));

        const statusCode = result.success ? 200 : 500;

        console.log(`✅ Location response sent for asset: ${assetId}`);
        res.status(statusCode).json(result);
    } catch (error) {
        console.error("❌ Error in location endpoint:", error.message);

        res.status(500).json({
            success: false,
            error: error.message,
            assetId: req.params.assetId,
            message: "Failed to fetch asset location",
        });
    }
});

/**
 * POST /unlock/:assetId
 * Unlock E-Lock device using iCloud Assets Controls API
 */
router.post("/unlock/:assetId", async (req, res) => {
    try {
        const { assetId } = req.params;
        console.log("📨 Unlock request for asset:", assetId);

        const result = await elockApiService.unlockDevice(assetId);

        const statusCode = result.success ? 200 : 500;

        console.log(`✅ Unlock response sent for asset: ${assetId}`);
        res.status(statusCode).json(result);
    } catch (error) {
        console.error("❌ Error in unlock endpoint:", error.message);

        res.status(500).json({
            success: false,
            error: error.message,
            assetId: req.params.assetId,
            message: "Failed to unlock device",
        });
    }
});

/**
 * GET /status
 * Check service status
 */
router.get("/status", async (req, res) => {
    try {
        console.log("📨 Service status check request");

        const result = await elockApiService.checkServiceStatus();

        const statusCode = result.success ? 200 : 500;

        console.log("✅ Service status response sent");
        res.status(statusCode).json(result);
    } catch (error) {
        console.error("❌ Error in status endpoint:", error.message);

        res.status(500).json({
            success: false,
            error: error.message,
            message: "Failed to check service status",
        });
    }
});

/**
 * GET /assign-limits
 * Proxy request to third-party limits API
 */
router.get("/assign-limits", async (req, res) => {
  console.log("DEBUG: /assign-limits route hit! Query:", req.query);
  try {
    const { ieCodeNo, type } = req.query;
    console.log(
      `📨 Proxying assignment limits request for IE: ${ieCodeNo}, Type: ${type}`
    );

    const apiKey = process.env.TRANSPORT_API_KEY || "1234567890";
    const serviceToken = await transportAuthService.getServiceToken();

    const targetBaseUrl = process.env.NODE_ENV === "development"
        ? "http://localhost:9007/api"
        : "https://eximbot.alvision.in/transport/api";

    const response = await axios.get(
      `${targetBaseUrl}/client-elock-assign-limits`,
      {
        params: { ieCodeNo, type },
        timeout: 10000,
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            ...(serviceToken && { Authorization: `Bearer ${serviceToken}` }),
        }
      }
    );

    console.log(`✅ Limits response received for IE: ${ieCodeNo}`);
    res.json(response.data);
  } catch (error) {
    console.warn("⚠️ Warning proxying limits:", error.message);
    res.status(200).json({
      success: false,
      error: error.message,
      data: null,
      message: "Assignment limits currently unavailable from third-party service",
    });
  }
});

/**
 * POST /maintenance/forecast/upload
 * Proxy forecast upload to maintenance service
 */
router.post("/maintenance/forecast/upload", upload.single("file"), async (req, res) => {
    try {
        console.log("📨 Proxying forecast upload request");
        
        if (!req.file) {
            return res.status(400).json({ success: false, error: "No file uploaded" });
        }

        const formData = new FormData();
        formData.append("file", req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        const serviceToken = await transportAuthService.getServiceToken();

        const targetBaseUrl = process.env.NODE_ENV === "development"
            ? "http://localhost:9007/api"
            : "https://eximbot.alvision.in/transport/api";

        const response = await axios.post(
            `${targetBaseUrl}/maintenance/elock-forecast/upload`,
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    ...(serviceToken && { Authorization: `Bearer ${serviceToken}` }),
                },
            }
        );

        console.log("✅ Forecast upload proxy successful");
        res.json(response.data);
    } catch (error) {
        console.error("❌ Error proxying forecast upload:", error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            message: "Failed to upload forecast to maintenance service",
        });
    }
});

/**
 * POST /mark-sample-downloaded
 * Update sample_downloaded status for an IE Code assignment
 */
router.post("/mark-sample-downloaded", async (req, res) => {
    try {
        const user = await EximclientUser.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        user.sample_downloaded = true;
        await user.save();
        
        return res.json({ success: true, message: "Sample download status updated globally for user" });
    } catch (error) {
        console.error("❌ Error marking sample downloaded:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});


/**
 * GET /elock-status-history/:containerId
 * Proxy to transport API elock-status-history
 */
router.get("/elock-status-history/:containerId", async (req, res) => {
    try {
        const { containerId } = req.params;
        const serviceToken = await transportAuthService.getServiceToken();

        const targetBaseUrl = process.env.NODE_ENV === "development"
            ? "http://localhost:9007/api"
            : "https://eximbot.alvision.in/transport/api";

        console.log(`📨 Proxying status history request for container: ${containerId}`);
        const response = await axios.get(
            `${targetBaseUrl}/elock-status-history/${containerId}`,
            {
                headers: {
                    ...(serviceToken && { Authorization: `Bearer ${serviceToken}` }),
                }
            }
        );
        res.json(response.data);
    } catch (error) {
        console.error("❌ Error proxying status history:", error.message);
        res.status(error.response?.status || 500).json({
            success: false,
            error: error.message,
            message: "Failed to fetch status history from transport service",
        });
    }
});

/**
 * GET /elock-status-history-others/:containerId
 * Proxy to transport API elock-status-history-others
 */
router.get("/elock-status-history-others/:containerId", async (req, res) => {
    try {
        const { containerId } = req.params;
        const serviceToken = await transportAuthService.getServiceToken();

        const targetBaseUrl = process.env.NODE_ENV === "development"
            ? "http://localhost:9007/api"
            : "https://eximbot.alvision.in/transport/api";

        console.log(`📨 Proxying others status history request for container: ${containerId}`);
        const response = await axios.get(
            `${targetBaseUrl}/elock-status-history-others/${containerId}`,
            {
                headers: {
                    ...(serviceToken && { Authorization: `Bearer ${serviceToken}` }),
                }
            }
        );
        res.json(response.data);
    } catch (error) {
        console.error("❌ Error proxying others status history:", error.message);
        res.status(error.response?.status || 500).json({
            success: false,
            error: error.message,
            message: "Failed to fetch others status history from transport service",
        });
    }
});

export default router;
