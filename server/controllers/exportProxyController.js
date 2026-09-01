import axios from "axios";
import mongoose from "mongoose";
import EximclientUser from "../models/eximclientUserModel.js";

const ExJobModel = mongoose.models.ExJob || mongoose.model("ExJob", new mongoose.Schema({}, { strict: false }), "ex_jobs");

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

export const jobMatchesExporterAssignment = (job, assignments) => {
  if (!assignments || assignments.length === 0) return true;

  const jobIec = (job.ieCode || job.exporter_ie_code || job.ie_code_no || "").trim().toUpperCase();
  const jobExporter = (job.exporter || job.exporter_name || job.importer || job.importer_name || "").trim().toUpperCase();

  return assignments.some((assignment) => {
    const assignIec = (assignment.ie_code_no || "").trim().toUpperCase();
    if (assignIec && jobIec && jobIec !== assignIec) {
      return false;
    }

    const filter = (assignment.exporter_filter || "").trim().toUpperCase();
    const assignedName = (assignment.importer_name || "").trim().toUpperCase();

    if (filter) {
      const filterTokens = filter.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
      return filterTokens.some((token) => {
        if (token === "MODERN INSULATORS LIMITED") {
          return jobExporter.includes("MODERN INSULATORS LIMITED") && !jobExporter.includes("TERRY TOWELS");
        }
        if (token === "MODERN INSULATORS LIMITED(TERRY TOWELS)" || token === "TERRY TOWELS") {
          return jobExporter.includes("TERRY TOWELS");
        }
        return jobExporter.includes(token);
      });
    }

    // Default for IEC 1388003881 when no explicit exporter_filter is set
    if (assignIec === "1388003881" || jobIec === "1388003881") {
      if (assignedName.includes("TERRY TOWELS")) {
        return jobExporter.includes("TERRY TOWELS");
      } else {
        return !jobExporter.includes("TERRY TOWELS");
      }
    }

    return true;
  });
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
      page: 1,
      limit: ieCodeAssignments.length > 0 ? 1000 : limit,
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
        forwardParams.page = page;
        forwardParams.limit = limit;
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

    let responseData = null;
    try {
      const exportApiUrl = `${EXPORT_API_BASE_URL}/operation-jobs/${encodeURIComponent(status)}`;
      const response = await axios.get(exportApiUrl, {
        params: forwardParams,
        headers: {
          username: "Admin",
          "x-username": "Admin"
        },
        timeout: 30000,
      });
      responseData = response.data;
    } catch (apiErr) {
      console.warn("Remote export API listing error, attempting local DB fallback:", apiErr.message);
    }

    const remoteJobs = responseData?.data?.jobs || [];
    if (remoteJobs.length > 0) {
      if (ieCodeAssignments.length > 0) {
        let filteredJobs = remoteJobs.filter((j) => jobMatchesExporterAssignment(j, ieCodeAssignments));
        if (exporter && exporter.toLowerCase() !== "all") {
          const expLower = exporter.toLowerCase().trim();
          filteredJobs = filteredJobs.filter((j) => {
            const jExp = (j.exporter || j.exporter_name || "").toLowerCase().trim();
            return jExp.includes(expLower);
          });
        }
        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 10;
        const totalCount = filteredJobs.length;
        const totalPages = Math.ceil(totalCount / limitNum) || 1;
        const paginatedJobs = filteredJobs.slice((pageNum - 1) * limitNum, pageNum * limitNum);

        return res.json({
          success: true,
          data: {
            jobs: paginatedJobs,
            pagination: {
              currentPage: pageNum,
              totalPages: totalPages,
              totalCount: totalCount,
              hasNextPage: pageNum < totalPages,
              hasPrevPage: pageNum > 1,
            },
            total: totalCount,
          },
        });
      }
      return res.json(responseData);
    }

    // Local MongoDB fallback (e.g. for demo client or offline server)
    const targetIeCodes = (forwardParams.ieCode || "").split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
    const localQuery = {};
    if (targetIeCodes.length > 0) {
      localQuery.$or = [
        { ieCode: { $in: targetIeCodes } },
        { exporter_ie_code: { $in: targetIeCodes } }
      ];
    }
    if (forwardParams.exporter) {
      const expEscaped = forwardParams.exporter.replace(/,/g, "|").replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const expRegex = new RegExp(expEscaped, "i");
      localQuery.$and = localQuery.$and || [];
      localQuery.$and.push({
        $or: [
          { exporter: expRegex },
          { exporter_name: expRegex },
          { exporter_filter: expRegex }
        ]
      });
    }
    if (status && status.toLowerCase() !== "all") {
      localQuery.status = new RegExp(`^${status}$`, "i");
    }
    if (year && year.toLowerCase() !== "all") {
      const escapedYear = year.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      localQuery.$and = localQuery.$and || [];
      localQuery.$and.push({
        $or: [
          { year: year },
          { job_no: new RegExp(`/${escapedYear}$`, "i") }
        ]
      });
    }

    let localJobs = await ExJobModel.find(localQuery).lean();
    if (ieCodeAssignments.length > 0) {
      localJobs = localJobs.filter((j) => jobMatchesExporterAssignment(j, ieCodeAssignments));
    }
    if (year && year.toLowerCase() !== "all") {
      const yearLower = year.toLowerCase();
      localJobs = localJobs.filter((j) => {
        if (!j) return false;
        const jYear = j.year ? String(j.year).trim().toLowerCase() : "";
        const jJobNo = j.job_no ? String(j.job_no).trim().toLowerCase() : "";
        if (jYear) return jYear === yearLower;
        if (jJobNo) return jJobNo.endsWith(`/${yearLower}`);
        return true;
      });
    }

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const totalCount = localJobs.length;
    const totalPages = Math.ceil(totalCount / limitNum) || 1;
    const paginatedJobs = localJobs.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.json({
      success: true,
      data: {
        jobs: paginatedJobs,
        pagination: {
          currentPage: pageNum,
          totalPages: totalPages,
          totalCount: totalCount,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
        total: totalCount,
      }
    });
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
      .select("exporter_ie_code_assignments role")
      .lean();

    if (!dbUser) {
      return res.status(401).json({ success: false, message: "User not found." });
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

    if (response.data?.success && response.data?.data && ieCodeAssignments.length > 0) {
      if (Array.isArray(response.data.data.exporters)) {
        response.data.data.exporters = response.data.data.exporters.filter((exp) => {
          const pseudoJob = { ieCode: exp.ieCode, exporter: exp.name, exporter_name: exp.name };
          return jobMatchesExporterAssignment(pseudoJob, ieCodeAssignments);
        });
      }
    }

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
      limit: ieCodeAssignments.length > 0 ? 1000 : 1,
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
    
    let results = [];
    try {
      const requests = statuses.map(status => {
        const exportApiUrl = `${EXPORT_API_BASE_URL}/operation-jobs/${encodeURIComponent(status)}`;
        return axios.get(exportApiUrl, {
          params: forwardParams,
          headers: { username: "Admin", "x-username": "Admin" },
          timeout: 15000,
        });
      });
      results = await Promise.all(requests);
    } catch (apiErr) {
      console.warn("Remote export tab counts error, attempting local DB fallback:", apiErr.message);
    }

    const counts = {};
    statuses.forEach((status, idx) => {
      const resData = results[idx]?.data;
      const rawJobs = resData?.data?.jobs || [];
      if (rawJobs.length > 0 && ieCodeAssignments.length > 0) {
        let matchedJobs = rawJobs.filter((j) => jobMatchesExporterAssignment(j, ieCodeAssignments));
        if (exporter && exporter.toLowerCase() !== "all") {
          const expLower = exporter.toLowerCase().trim();
          matchedJobs = matchedJobs.filter((j) => {
            const jExp = (j.exporter || j.exporter_name || "").toLowerCase().trim();
            return jExp.includes(expLower);
          });
        }
        counts[status] = matchedJobs.length;
      } else {
        counts[status] = resData?.data?.pagination?.totalCount || 0;
      }
    });

    const totalRemoteCount = Object.values(counts).reduce((a, b) => a + b, 0);

    if (totalRemoteCount === 0) {
      const targetIeCodes = (forwardParams.ieCode || "").split(",").map(s => s.trim().toUpperCase()).filter(Boolean);
      const localQuery = {};
      if (targetIeCodes.length > 0) {
        localQuery.$or = [
          { ieCode: { $in: targetIeCodes } },
          { exporter_ie_code: { $in: targetIeCodes } }
        ];
      }
      const localJobs = await ExJobModel.find(localQuery).lean();
      if (localJobs.length > 0) {
        statuses.forEach((s) => {
          const matchCount = localJobs.filter(j => (j.status || "pending").toLowerCase() === s.toLowerCase()).length;
          counts[s] = matchCount;
        });
      }
    }

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
