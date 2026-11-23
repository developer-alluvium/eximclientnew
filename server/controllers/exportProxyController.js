import axios from "axios";
import mongoose from "mongoose";
import EximclientUser from "../models/eximclientUserModel.js";

const EXPORT_API_BASE_URL = process.env.EXPORT_API_BASE_URL || "http://localhost:9002/api";

const escapeRegex = (string) => {
  return string ? string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") : "";
};

const isDemoUserRequest = (user, ieCodeQuery = "") => {
  if (!user && !ieCodeQuery) return false;
  const email = String(user?.email || "").toLowerCase().trim();
  const ieStr = String(ieCodeQuery || "").toUpperCase().trim();
  if (email === "demo@novusha.com" || email.includes("demo")) return true;
  if (ieStr === "DEMO100001" || ieStr.startsWith("DEMO")) return true;
  const assignments = (user?.exporter_ie_code_assignments || []).concat(user?.ie_code_assignments || []);
  if (assignments.some((a) => {
    const code = String(a?.ie_code_no || "").toUpperCase().trim();
    return code === "DEMO100001" || code.startsWith("DEMO");
  })) {
    return true;
  }
  return false;
};

const getDemoExJobModel = () => {
  return mongoose.models.DemoExJob || mongoose.model("DemoExJob", new mongoose.Schema({}, { strict: false }), "demo_ex_jobs");
};

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

const getExporterFilterFromAssignments = (ieCodeAssignments, requestedIeCode, requestedExporter) => {
  if (requestedExporter) return requestedExporter;
  if (!ieCodeAssignments || ieCodeAssignments.length === 0) return "";

  if (requestedIeCode && requestedIeCode !== "all") {
    const target = ieCodeAssignments.find((a) => a.ie_code_no === requestedIeCode);
    return target?.exporter_filter || "";
  }

  const filters = ieCodeAssignments.map((a) => a.exporter_filter).filter(Boolean);
  return filters.length > 0 ? filters.join(",") : "";
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
      customHouse = "",
      goods_stuffed_at = "",
      pendingQueries = false,
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
      customHouse,
      goods_stuffed_at,
      pendingQueries,
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

      const defaultExporterFilter = getExporterFilterFromAssignments(ieCodeAssignments, ieCode, exporter);
      if (defaultExporterFilter) {
        forwardParams.exporter = defaultExporterFilter;
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

    // Check if demo user
    const isDemo = isDemoUserRequest(dbUser, forwardParams.ieCode || req.query.ieCode);

    if (isDemo) {
      console.log(`[Export Proxy] Demo user detected (${dbUser.email}), querying 'demo_ex_jobs' collection.`);
      const DemoExJobModel = getDemoExJobModel();
      const targetIeCode = "DEMO100001";

      const localQuery = {
        $or: [
          { ieCode: targetIeCode },
          { exporter_ie_code: targetIeCode },
          { iec_no: targetIeCode },
          { exporter: /NOVUSHA DEMO/i },
          { exporter_name: /NOVUSHA DEMO/i }
        ]
      };

      if (status && status.toLowerCase() !== "all") {
        const statusRegex = new RegExp(`^${escapeRegex(status)}$`, "i");
        localQuery.$and = localQuery.$and || [];
        localQuery.$and.push({ status: statusRegex });
      }

      if (year && year.toLowerCase() !== "all") {
        const yearRegex = new RegExp(`^${escapeRegex(year)}$`, "i");
        localQuery.$and = localQuery.$and || [];
        localQuery.$and.push({ year: yearRegex });
      }

      if (search && search.trim()) {
        const sRegex = new RegExp(escapeRegex(search.trim()), "i");
        localQuery.$and = localQuery.$and || [];
        localQuery.$and.push({
          $or: [
            { job_no: sRegex },
            { job_number: sRegex },
            { sb_no: sRegex },
            { invoiceNumber: sRegex },
            { consignee_name: sRegex }
          ]
        });
      }

      const demoExportJobs = await DemoExJobModel.find(localQuery).sort({ job_date: -1, createdAt: -1 }).lean();

      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const startIndex = (pageNum - 1) * limitNum;
      const paginatedJobs = demoExportJobs.slice(startIndex, startIndex + limitNum);

      return res.json({
        success: true,
        data: {
          jobs: paginatedJobs,
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(demoExportJobs.length / limitNum) || 1,
            totalCount: demoExportJobs.length,
            hasNextPage: startIndex + limitNum < demoExportJobs.length,
            hasPrevPage: pageNum > 1,
          }
        },
        message: "Demo export jobs fetched successfully from demo_ex_jobs collection"
      });
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

    // Fallback to demo_ex_jobs if demo request failed
    if (req.user && isDemoUserRequest(req.user)) {
      try {
        const DemoExJobModel = getDemoExJobModel();
        const demoExportJobs = await DemoExJobModel.find({ ieCode: "DEMO100001" }).lean();
        return res.json({
          success: true,
          data: {
            jobs: demoExportJobs,
            pagination: {
              currentPage: 1,
              totalPages: 1,
              totalCount: demoExportJobs.length,
              hasNextPage: false,
              hasPrevPage: false,
            }
          },
          message: "Demo export jobs fallback fetched successfully"
        });
      } catch (fbErr) {
        console.error("Export proxy demo fallback failed:", fbErr);
      }
    }

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

/**
 * GET /api/exports/filter-options
 * Proxies the request to get dynamic filter options based on the client's assigned exporters.
 */
export const proxyExportFilterOptions = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    // Fetch fresh user data to get IE code assignments
    const dbUser = await EximclientUser.findById(user.id || user._id)
      .select("exporter_ie_code_assignments role email")
      .lean();

    if (!dbUser) {
      return res.status(401).json({ success: false, message: "User not found." });
    }

    if (isDemoUserRequest(dbUser, req.query.ieCode)) {
      return res.json({
        success: true,
        data: {
          branches: ["AMD"],
          customHouses: ["MUNDRA SEA", "ICD SANAND", "HAZIRA SEA"],
          consignmentTypes: ["FCL"],
          goodsStuffedAt: [],
          years: ["26-27"],
          exporters: ["NOVUSHA DEMO GLOBAL IMPEX PRIVATE LIMITED"],
          detailedStatuses: ["Pending", "SB Filed", "L.E.O", "Container HO"],
          months: []
        }
      });
    }

    const isAdmin = dbUser.role === "admin" || dbUser.role === "super_admin" || dbUser.role === "superadmin";
    const ieCodeAssignments = dbUser.exporter_ie_code_assignments || [];

    const { ieCode = "" } = req.query;
    const forwardParams = {};

    if (ieCode && ieCode !== "all") {
      const assignedCodes = ieCodeAssignments.map((a) => a.ie_code_no).filter(Boolean);
      if (assignedCodes.includes(ieCode) || isAdmin) {
        forwardParams.ieCode = ieCode;
      } else {
        return res.status(403).json({ success: false, message: "Access denied to exporter." });
      }
    } else if (ieCodeAssignments.length > 0) {
      const assignedCodes = ieCodeAssignments.map((a) => a.ie_code_no).filter(Boolean);
      forwardParams.ieCode = assignedCodes.join(",");
    } else if (!isAdmin) {
      // Non-admins with no assignments get empty filters list
      return res.json({
        success: true,
        data: {
          branches: [],
          customHouses: [],
          consignmentTypes: [],
          goodsStuffedAt: [],
          years: [],
          exporters: [],
          detailedStatuses: [],
          months: []
        }
      });
    }

    if (ieCodeAssignments.length > 0) {
      const assignedExporterFilter = getExporterFilterFromAssignments(ieCodeAssignments, ieCode, "");
      if (assignedExporterFilter) {
        forwardParams.exporter = assignedExporterFilter;
      }
    }

    const exportFilterUrl = `${EXPORT_API_BASE_URL}/operation-jobs-filters`;

    const response = await axios.get(exportFilterUrl, {
      params: forwardParams,
      headers: {
        username: "Admin",
        "x-username": "Admin"
      },
      timeout: 30000,
    });

    return res.json(response.data);
  } catch (error) {
    console.error("Export proxy filter options error:", error);

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
      message: "Failed to fetch export filter options.",
      error: error.message,
    });
  }
};

/**
 * GET /api/exports/tab-counts
 * Proxies the requests to list jobs of each status in parallel with limit=1, returning total tab counts.
 */
export const proxyExportTabCounts = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const dbUser = await EximclientUser.findById(user.id || user._id)
      .select("exporter_ie_code_assignments role selected_branches")
      .lean();

    if (!dbUser) {
      return res.status(401).json({ success: false, message: "User not found." });
    }

    const isAdmin = dbUser.role === "admin" || dbUser.role === "super_admin" || dbUser.role === "superadmin";
    const ieCodeAssignments = dbUser.exporter_ie_code_assignments || [];

    const {
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
      customHouse = "",
      goods_stuffed_at = "",
      pendingQueries = false,
    } = req.query;

    const forwardParams = {
      limit: 1,
      search,
      country,
      consignmentType,
      branch,
      year,
      detailedStatus,
      jobOwner,
      month,
      customHouse,
      goods_stuffed_at,
      pendingQueries,
    };

    if (ieCodeAssignments.length > 0) {
      const ieCodes = ieCodeAssignments.map((a) => a.ie_code_no).filter(Boolean);
      if (ieCode && ieCodes.includes(ieCode)) {
        forwardParams.ieCode = ieCode;
      } else {
        forwardParams.ieCode = ieCodes.join(",");
      }

      const assignedExporterFilter = getExporterFilterFromAssignments(ieCodeAssignments, ieCode, exporter);
      if (assignedExporterFilter) {
        forwardParams.exporter = assignedExporterFilter;
      }
    } else if (!isAdmin) {
      return res.json({
        success: true,
        data: { pending: 0, "booking pending": 0, "handover pending": 0, "billing pending": 0, completed: 0, cancelled: 0 }
      });
    }

    if (isAdmin) {
      const branchRestrictions = dbUser.selected_branches || [];
      if (branchRestrictions.length > 0) {
        forwardParams.branch = branchRestrictions.join(",");
      }
    }

    if (exporter) {
      forwardParams.exporter = exporter;
    }

    const statuses = ["pending", "booking pending", "handover pending", "billing pending", "completed", "cancelled"];

    // Call main backend in parallel
    const requests = statuses.map(status => {
      const exportApiUrl = `${EXPORT_API_BASE_URL}/operation-jobs/${encodeURIComponent(status)}`;
      return axios.get(exportApiUrl, {
        params: forwardParams,
        headers: { username: "Admin", "x-username": "Admin" },
        timeout: 10000,
      });
    });

    const results = await Promise.all(requests);
    const counts = {};
    statuses.forEach((status, idx) => {
      const resData = results[idx].data;
      counts[status] = resData.data?.pagination?.totalCount || 0;
    });

    return res.json({
      success: true,
      data: counts
    });

  } catch (error) {
    console.error("Export proxy tab counts error:", error);
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
      message: "Failed to fetch export tab counts.",
      error: error.message,
    });
  }
};

/**
 * GET /api/superadmin/exporter-branches
 * Fetches distinct sub-branch / exporter names from Exim-Export for given ieCode query param.
 */
export const proxyExporterBranches = async (req, res) => {
  try {
    const { ieCode = "" } = req.query;
    const response = await axios.get(`${EXPORT_API_BASE_URL}/operation-jobs-exporter-names`, {
      params: { ieCode },
      timeout: 10000,
    });
    return res.json(response.data);
  } catch (error) {
    console.error("Fetch exporter branches proxy error:", error);
    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      return res.status(503).json({
        success: false,
        message: "Export API is currently unavailable.",
        error: error.message,
      });
    }
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({
      success: false,
      message: "Failed to fetch exporter sub-branches.",
      error: error.message,
    });
  }
};

/**
 * POST /api/exports/create-client-job
 * Proxies the request to create a client export job to Exim-Export server.
 */
export const createClientExportJob = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const payload = req.body;

    const exportApiUrl = `${EXPORT_API_BASE_URL}/jobs/add-job-exp-man`;

    const response = await axios.post(exportApiUrl, payload, {
      headers: {
        username: user.name || "Client",
        "x-username": user.name || "Client"
      },
      timeout: 30000,
    });

    return res.json(response.data);
  } catch (error) {
    console.error("Create client export job proxy error:", error);

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
      message: "Failed to create export job.",
      error: error.message,
    });
  }
};

