import axios from "axios";
import EximclientUser from "../models/eximclientUserModel.js";

const EXPORT_API_BASE_URL = process.env.EXPORT_API_BASE_URL || "http://localhost:9002/api";

/**
 * GET /api/superadmin/available-exporters
 * Fetches exporters from the Export API's directory/iec-codes endpoint.
 * Returns { iecNo, exporterName, alias, panNo, entityType, approvalStatus }[]
 * Protected: SuperAdmin only
 */
export const getAvailableExporters = async (req, res) => {
  try {
    const { search = "", status = "" } = req.query;

    const params = {};
    if (search) params.search = search;
    if (status) params.status = status;

    const response = await axios.get(`${EXPORT_API_BASE_URL}/directory/iec-codes`, {
      params,
      timeout: 10000,
    });

    if (response.data && response.data.success) {
      return res.json({
        success: true,
        data: response.data.data || [],
        message: response.data.message || `Found ${(response.data.data || []).length} exporter(s)`,
      });
    }

    res.json({
      success: true,
      data: [],
      message: "No exporters found",
    });
  } catch (error) {
    console.error("Get available exporters (Export API) error:", error);

    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      return res.status(503).json({
        success: false,
        message: "Export API is currently unavailable. Please ensure the Export server is running.",
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to fetch available exporters from Export API.",
      error: error.message,
    });
  }
};

/**
 * GET /api/exports/:status
 * Proxies the export listing request to the Exim-Export server.
 *
 * Business rules:
 *  - If the requesting user has ie_code_assignments, the `ieCode` query param
 *    is automatically populated (overriding whatever the client sent).
 *  - If the user has NO ie_code_assignments → return empty result (no access).
 *  - Admins can freely filter by any ieCode.
 *
 * Supported query params: page, limit, search, exporter, country,
 *   consignmentType, branch, status, year, detailedStatus, jobOwner, month
 */
export const proxyExportListing = async (req, res) => {
  try {
    const { status = "all" } = req.params;

    // The authenticated user (set by authenticateUser middleware)
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    // Fetch fresh user data to get IE code assignments
    const dbUser = await EximclientUser.findById(user.id || user._id)
      .select("exporter_ie_code_assignments role name email selected_branches")
      .lean();

    if (!dbUser) {
      return res.status(401).json({ success: false, message: "User not found." });
    }

    const isAdmin = dbUser.role === "admin" || dbUser.role === "super_admin" || dbUser.role === "superadmin";
    const ieCodeAssignments = dbUser.exporter_ie_code_assignments || [];

    // Build query params to forward to the Export API
    const {
      page = 1,
      limit = 10,
      search = "",
      exporter = "",
      ieCode = "",
      country = "",
      consignmentType = "",
      branch = "",
      year = "",
      detailedStatus = "",
      jobOwner = "",
      month = "",
    } = req.query;

    const forwardParams = {
      page,
      limit,
      search,
      country,
      consignmentType,
      branch,
      year,
      detailedStatus,
      jobOwner,
      month,
    };

    // Check if the user has assigned exporters (both Admin and Client User roles can have assignments)
    if (ieCodeAssignments.length > 0) {
      const ieCodes = ieCodeAssignments.map((a) => a.ie_code_no).filter(Boolean);
      if (ieCode && ieCodes.includes(ieCode)) {
        // Safe: they are filtering by a specific ieCode that is assigned to them
        forwardParams.ieCode = ieCode;
      } else {
        // Default: combined data of all assigned exporters
        forwardParams.ieCode = ieCodes.join(",");
      }
    } else {
      // Regular users with no IE code assignments get empty result immediately
      if (!isAdmin) {
        return res.json({
          success: true,
          data: {
            jobs: [],
            pagination: {
              currentPage: 1,
              totalPages: 0,
              totalCount: 0,
              hasNextPage: false,
              hasPrevPage: false,
            },
          },
          message: "No exporter assigned. Please contact your administrator.",
          noAccess: true,
        });
      } else {
        if (ieCode) forwardParams.ieCode = ieCode;
      }
    }

    // Branch restrictions for admins
    if (isAdmin) {
      const branchRestrictions = dbUser.selected_branches || [];
      if (branchRestrictions.length > 0) {
        forwardParams.branch = branchRestrictions.join(",");
      }
    }

    if (exporter) {
      forwardParams.exporter = exporter;
    }

    const exportApiUrl = `${EXPORT_API_BASE_URL}/operation-jobs/${encodeURIComponent(status)}`;

    const response = await axios.get(exportApiUrl, {
      params: forwardParams,
      headers: {
        username: "Admin",
        "x-username": "Admin"
      },
      timeout: 30000,
    });

    return res.json(response.data);
  } catch (error) {
    console.error("Export proxy listing error:", error);

    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      return res.status(503).json({
        success: false,
        message: "Export API is currently unavailable. Please ensure the Export server is running.",
        error: error.message,
      });
    }

    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }

    res.status(500).json({
      success: false,
      message: "Failed to fetch export jobs.",
      error: error.message,
    });
  }
};
