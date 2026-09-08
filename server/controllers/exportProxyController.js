import axios from "axios";
import mongoose from "mongoose";
import EximclientUser from "../models/eximclientUserModel.js";

const ExJobModel = mongoose.models.ExJob || mongoose.model("ExJob", new mongoose.Schema({}, { strict: false }), "ex_jobs");

const getCandidateUrls = () => {
  const primary = process.env.EXPORT_API_BASE_URL || "https://eximbot.alvision.in/export/api";
  const candidates = [
    primary,
    "https://eximbot.alvision.in/export/api",
    "https://export.alvision.in/api",
    "http://127.0.0.1:9002/api",
    "http://localhost:9002/api"
  ];
  return Array.from(new Set(candidates.filter(Boolean)));
};

const axiosGetWithFallback = async (endpointPath, config = {}) => {
  const candidateUrls = getCandidateUrls();
  let lastError = null;

  for (const baseUrl of candidateUrls) {
    try {
      const cleanBase = baseUrl.replace(/\/+$/, "");
      const cleanPath = endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`;
      const url = `${cleanBase}${cleanPath}`;

      const response = await axios.get(url, {
        ...config,
        headers: {
          username: "Admin",
          "x-username": "Admin",
          ...(config.headers || {}),
        },
        timeout: config.timeout || 15000,
      });
      return response;
    } catch (err) {
      lastError = err;
      if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND" || err.code === "ETIMEDOUT") {
        console.warn(`Export API attempt to ${baseUrl} failed (${err.code}), trying next candidate...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
};

const buildLocalFilterOptions = async (ieCodeAssignments, isAdmin) => {
  const localQuery = {};
  if (ieCodeAssignments.length > 0) {
    const targetIeCodes = ieCodeAssignments.map((a) => a.ie_code_no).filter(Boolean);
    if (targetIeCodes.length > 0) {
      localQuery.$or = [
        { ieCode: { $in: targetIeCodes } },
        { exporter_ie_code: { $in: targetIeCodes } }
      ];
    }
  }

  const jobs = await ExJobModel.find(localQuery)
    .select("custom_house customHouse branch_code branch consignmentType goods_stuffed_at stuffed_at year job_no exporter exporter_name detailedStatus createdAt ieCode exporter_ie_code")
    .lean();

  let matchedJobs = jobs;
  if (ieCodeAssignments.length > 0) {
    matchedJobs = jobs.filter((j) => jobMatchesExporterAssignment(j, ieCodeAssignments));
  }

  const customHousesSet = new Set();
  const branchesSet = new Set();
  const consignmentTypesSet = new Set();
  const goodsStuffedAtSet = new Set();
  const yearsSet = new Set();
  const exportersMap = new Map();
  const detailedStatusesSet = new Set();
  const monthsSet = new Set();

  matchedJobs.forEach((job) => {
    const ch = job.custom_house || job.customHouse;
    if (ch) customHousesSet.add(ch.trim());

    const br = job.branch_code || job.branch;
    if (br) branchesSet.add(br.trim());

    const ct = job.consignmentType;
    if (ct) consignmentTypesSet.add(ct.trim());

    const sa = job.goods_stuffed_at || job.stuffed_at;
    if (sa) goodsStuffedAtSet.add(sa.trim());

    let yr = job.year;
    if (!yr && job.job_no) {
      const parts = String(job.job_no).split("/");
      if (parts.length > 1) yr = parts[parts.length - 1];
    }
    if (yr) yearsSet.add(yr.trim());

    const expName = job.exporter || job.exporter_name;
    const iec = job.ieCode || job.exporter_ie_code;
    if (expName) {
      exportersMap.set(expName.trim(), { name: expName.trim(), ieCode: iec ? iec.trim() : "" });
    }

    if (Array.isArray(job.detailedStatus)) {
      job.detailedStatus.forEach((ds) => { if (ds) detailedStatusesSet.add(String(ds).trim()); });
    } else if (job.detailedStatus) {
      detailedStatusesSet.add(String(job.detailedStatus).trim());
    }

    if (job.createdAt) {
      const m = new Date(job.createdAt).getMonth() + 1;
      if (!isNaN(m)) monthsSet.add(m);
    }
  });

  return {
    branches: Array.from(branchesSet).sort(),
    customHouses: Array.from(customHousesSet).sort(),
    consignmentTypes: Array.from(consignmentTypesSet).sort(),
    goodsStuffedAt: Array.from(goodsStuffedAtSet).sort(),
    years: Array.from(yearsSet).sort(),
    exporters: Array.from(exportersMap.values()),
    detailedStatuses: Array.from(detailedStatusesSet).sort(),
    months: Array.from(monthsSet).sort((a, b) => a - b),
  };
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

    let responseData = null;
    try {
      const response = await axiosGetWithFallback("/directory/iec-codes", {
        params,
        timeout: 10000,
      });
      responseData = response.data;
    } catch (err) {
      console.warn("Get available exporters API error, using local DB fallback:", err.message);
    }

    if (responseData && responseData.success) {
      return res.json({
        success: true,
        data: responseData.data || [],
        message: responseData.message || `Found ${(responseData.data || []).length} exporter(s)`,
      });
    }

    // Local DB fallback for exporters
    const jobs = await ExJobModel.find({}).select("exporter exporter_name ieCode exporter_ie_code").lean();
    const map = new Map();
    jobs.forEach(j => {
      const iec = j.ieCode || j.exporter_ie_code;
      const name = j.exporter || j.exporter_name;
      if (iec && name && !map.has(iec)) {
        map.set(iec, { iecNo: iec, exporterName: name, approvalStatus: "APPROVED" });
      }
    });

    return res.json({
      success: true,
      data: Array.from(map.values()),
      message: `Found ${map.size} exporter(s) (local fallback)`,
    });
  } catch (error) {
    console.error("Get available exporters error:", error);
    res.json({
      success: true,
      data: [],
      message: "No exporters found",
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
 */
export const proxyExportListing = async (req, res) => {
  try {
    const { status = "all" } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const dbUser = await EximclientUser.findById(user.id || user._id)
      .select("exporter_ie_code_assignments role name email selected_branches")
      .lean();

    if (!dbUser) {
      return res.status(401).json({ success: false, message: "User not found." });
    }

    const isAdmin = dbUser.role === "admin" || dbUser.role === "super_admin" || dbUser.role === "superadmin";
    const ieCodeAssignments = dbUser.exporter_ie_code_assignments || [];

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

    if (ieCodeAssignments.length > 0) {
      const ieCodes = ieCodeAssignments.map((a) => a.ie_code_no).filter(Boolean);
      if (ieCode && ieCodes.includes(ieCode)) {
        forwardParams.ieCode = ieCode;
      } else {
        forwardParams.ieCode = ieCodes.join(",");
      }

      const defaultExporterFilter = getExporterFilterFromAssignments(ieCodeAssignments, ieCode, exporter);
      if (defaultExporterFilter) {
        forwardParams.exporter = defaultExporterFilter;
      }
    } else {
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
      const response = await axiosGetWithFallback(`/operation-jobs/${encodeURIComponent(status)}`, {
        params: forwardParams,
        timeout: 20000,
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

    // Local MongoDB fallback
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

    let localJobs = await ExJobModel.find(localQuery).lean();
    if (ieCodeAssignments.length > 0) {
      localJobs = localJobs.filter((j) => jobMatchesExporterAssignment(j, ieCodeAssignments));
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
      },
    });
  } catch (error) {
    console.error("Export proxy listing error:", error);
    return res.json({
      success: true,
      data: {
        jobs: [],
        pagination: { currentPage: 1, totalPages: 0, totalCount: 0, hasNextPage: false, hasPrevPage: false },
        total: 0,
      },
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

    try {
      const response = await axiosGetWithFallback("/operation-jobs-filters", {
        params: forwardParams,
        timeout: 15000,
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
    } catch (apiErr) {
      console.warn("Remote export filter options error, falling back to local DB:", apiErr.message);
      const localFilterData = await buildLocalFilterOptions(ieCodeAssignments, isAdmin);
      return res.json({
        success: true,
        data: localFilterData,
        message: "Loaded filter options from local database fallback.",
      });
    }
  } catch (error) {
    console.error("Export proxy filter options error:", error);
    const localFilterData = await buildLocalFilterOptions([], true).catch(() => ({
      branches: [], customHouses: [], consignmentTypes: [], goodsStuffedAt: [], years: [], exporters: [], detailedStatuses: [], months: []
    }));

    return res.json({
      success: true,
      data: localFilterData,
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
        return axiosGetWithFallback(`/operation-jobs/${encodeURIComponent(status)}`, {
          params: forwardParams,
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
    return res.json({
      success: true,
      data: { pending: 0, "booking pending": 0, "handover pending": 0, "billing pending": 0, completed: 0, cancelled: 0 }
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
    let responseData = null;
    try {
      const response = await axiosGetWithFallback("/operation-jobs-exporter-names", {
        params: { ieCode },
        timeout: 10000,
      });
      responseData = response.data;
    } catch (err) {
      console.warn("Fetch exporter branches proxy error, attempting local DB fallback:", err.message);
    }

    if (responseData) {
      return res.json(responseData);
    }

    const localQuery = ieCode ? { $or: [{ ieCode }, { exporter_ie_code: ieCode }] } : {};
    const jobs = await ExJobModel.find(localQuery).select("exporter exporter_name").lean();
    const uniqueExporters = Array.from(new Set(jobs.map(j => (j.exporter || j.exporter_name || "").trim()).filter(Boolean))).sort();

    return res.json({
      success: true,
      data: uniqueExporters,
    });
  } catch (error) {
    console.error("Fetch exporter branches error:", error);
    return res.json({
      success: true,
      data: [],
    });
  }
};
