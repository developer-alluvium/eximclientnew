import express from "express";
import axios from "axios";
import elockApiService from "../services/elockApiService.js";
import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

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

        // Pass query parameters to the service method
        const result = await elockApiService.getElockAssignments(queryParams);

        // Set appropriate HTTP status based on result
        const statusCode = result.success ? 200 : 500;

        console.log(
            `✅ Assignment response sent with ${result.data?.length} records`
        );
        res.status(statusCode).json(result);
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

        const result = await elockApiService.getAssignmentById(id);

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

    const response = await axios.get(
       "http://3.108.244.38:9005/api/client-elock-assign-limits",
      // "https://eximbot.alvision.in/transport/api/client-elock-assign-limits",
      {
        params: { ieCodeNo, type },
      }
    );

    console.log(`✅ Limits response received for IE: ${ieCodeNo}`);
    res.json(response.data);
  } catch (error) {
    console.error("❌ Error proxying limits:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to fetch assignment limits from third-party service",
    });
  }
});


export default router;
