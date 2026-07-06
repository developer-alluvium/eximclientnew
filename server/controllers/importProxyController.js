import axios from "axios";
import mongoose from "mongoose";
import EximclientUser from "../models/eximclientUserModel.js";

const IMPORT_API_BASE_URL = process.env.IMPORT_API_BASE_URL || "http://localhost:9006/api";

// Helper function to format importer URL/name
function formatImporter(importer) {
  if (!importer) return "";
  return importer
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[\.\-\/,\(\)\[\]]/g, "")
    .replace(/_+/g, "_");
}

// Helper to escape regex
const escapeRegex = (string) => {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
};

// Dynamic branch resolver from database
const getBranchIdByCodeOrQuery = async (branchQuery, category = null) => {
  if (!branchQuery) return null;
  if (mongoose.Types.ObjectId.isValid(branchQuery)) {
    return new mongoose.Types.ObjectId(branchQuery);
  }
  try {
    const branchesCol = mongoose.connection.db.collection("branches");
    const query = {
      $or: [
        { branch_code: branchQuery.toUpperCase().trim() },
        { branch_name: new RegExp(`^${branchQuery.trim()}$`, "i") }
      ]
    };
    if (category) {
      query.category = category.toUpperCase().trim();
    }
    const branch = await branchesCol.findOne(query);
    return branch ? branch._id : null;
  } catch (err) {
    console.error("Error looking up branch:", err);
    return null;
  }
};

/**
 * GET /api/get-importer-jobs/:importerURL/:year
 * GET /api/gandhidham/get-importer-jobs/:importerURL/:year
 */
export const getImporterJobCounts = async (req, res) => {
  try {
    const { importerURL, year } = req.params;
    const isGandhidham = req.path.includes("/gandhidham/");

    const params = {};
    if (isGandhidham) {
      const gimBranchId = await getBranchIdByCodeOrQuery("GIM", "SEA");
      if (gimBranchId) {
        params.branchId = gimBranchId.toString();
      }
    }

    const response = await axios.get(
      `${IMPORT_API_BASE_URL}/get-importer-jobs/${encodeURIComponent(importerURL)}/${encodeURIComponent(year)}`,
      {
        params,
        headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
        timeout: 15000,
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Proxy get importer job counts error:", error.message);
    res.status(500).json({ error: "Failed to fetch job counts from third-party API." });
  }
};

/**
 * GET /api/get-job/:year/:jobNo
 */
export const getJobByNumber = async (req, res) => {
  try {
    const { year, jobNo } = req.params;

    // Fetch matching jobs from eximdev's search listing
    const response = await axios.get(
      `${IMPORT_API_BASE_URL}/${encodeURIComponent(year)}/jobs/all/all/all/all`,
      {
        params: { search: jobNo, limit: 100 },
        headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
        timeout: 20000,
      }
    );

    const jobs = response.data?.data || [];
    const matchedJob = jobs.find((j) => j.job_no === jobNo);

    if (!matchedJob) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json(matchedJob);
  } catch (error) {
    console.error("Proxy get job by number error:", error.message);
    res.status(500).json({ error: "Failed to fetch job details from third-party API." });
  }
};

/**
 * GET /api/:year/jobs/:status/:detailedStatus/:customHouse/multiple
 * GET /api/:year/jobs/:status/:detailedStatus/:importer
 * GET /api/gandhidham/:year/jobs/:status/:detailedStatus/:customHouse/multiple
 */
export const proxyImportListing = async (req, res) => {
  try {
    const { year, status, detailedStatus, customHouse = "all", importer: paramImporter = "all" } = req.params;
    const isGandhidham = req.path.includes("/gandhidham/");

    const {
      page = 1,
      limit = 100,
      search = "",
      exporter = "",
      branchId: queryBranchId,
      branch: queryBranch,
      importer: queryImporter,
    } = req.query;

    const importer = queryImporter || paramImporter || "all";

    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const dbUser = await EximclientUser.findById(user.id || user._id)
      .select("ie_code_assignments role")
      .lean();

    if (!dbUser) {
      return res.status(401).json({ success: false, message: "User not found." });
    }

    const isAdmin = dbUser.role === "admin" || dbUser.role === "super_admin" || dbUser.role === "superadmin";
    const ieCodeAssignments = dbUser.ie_code_assignments || [];

    if (!isAdmin && ieCodeAssignments.length === 0) {
      return res.json({
        message: "No importer assigned. Please contact your administrator.",
        data: [],
        total: 0,
        currentPage: 1,
        totalPages: 0,
      });
    }

    // Call eximdev's search listing for year/status/detailedStatus/customHouse/importer
    // Passing all query params to eximdev API
    const forwardParams = {
      page: 1,
      limit: 10000, // Fetch all candidate jobs to filter by ieCode/importer in proxy
      search,
      exporter,
    };

    if (isAdmin) {
      if (importer && importer.toLowerCase() !== "all") {
        forwardParams.importer = importer;
      }
      const clientIeCodes = req.query.ieCodes || req.query.ie_codes;
      if (clientIeCodes) {
        forwardParams.ieCodes = clientIeCodes;
        forwardParams.ie_codes = clientIeCodes;
      }
    } else {
      // Non-admins: restrict to their assigned IE codes and importer names
      const assignedIECodes = ieCodeAssignments.map((a) => a.ie_code_no.toUpperCase().trim()).filter(Boolean);
      const requestedIECodes = (req.query.ieCodes || req.query.ie_codes || "")
        .split(",")
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean);

      let targetIECodes = [];
      if (requestedIECodes.length > 0) {
        // Intersect requested with assigned
        targetIECodes = requestedIECodes.filter((code) => assignedIECodes.includes(code));
      } else {
        targetIECodes = assignedIECodes;
      }

      if (targetIECodes.length > 0) {
        forwardParams.ieCodes = targetIECodes.join(",");
        forwardParams.ie_codes = targetIECodes.join(",");
      } else {
        forwardParams.ieCodes = "unauthorized_ie_code_placeholder";
        forwardParams.ie_codes = "unauthorized_ie_code_placeholder";
      }

      // Enforce importer filter if requested and allowed
      const allowedImporterNames = ieCodeAssignments.map((a) => a.importer_name.trim().toLowerCase());
      if (importer && importer.toLowerCase() !== "all") {
        const isAllowed = allowedImporterNames.some((name) => name === importer.trim().toLowerCase());
        if (isAllowed) {
          forwardParams.importer = importer;
        } else {
          forwardParams.importer = "unauthorized_importer_placeholder";
        }
      }
    }

    // Check if branch filter is a special mode selector (Sea / Air only, no branch restriction)
    const SEA_MODE_KEY = "__SEA__";
    const AIR_MODE_KEY = "__AIR__";
    const branchFilterQuery = queryBranchId || queryBranch;
    const isModeOnlyFilter = branchFilterQuery === SEA_MODE_KEY || branchFilterQuery === AIR_MODE_KEY;

    // Check if composite "BRANCHCODE:CATEGORY" key (e.g. "AHM:SEA" or "AHM:AIR")
    const isCompositeKey = branchFilterQuery && branchFilterQuery.includes(":");
    let compositeCode = null;
    let compositeCategory = null;
    if (isCompositeKey) {
      [compositeCode, compositeCategory] = branchFilterQuery.split(":");
    }

    const isModeFilter = isModeOnlyFilter || isCompositeKey;

    // If a branch is specified in the filter, resolve its branch ID
    let resolvedBranchId = null;
    if (!isModeFilter) {
      if (branchFilterQuery) {
        resolvedBranchId = await getBranchIdByCodeOrQuery(branchFilterQuery);
      } else if (isGandhidham) {
        resolvedBranchId = await getBranchIdByCodeOrQuery("GIM", "SEA");
      }
    } else if (isCompositeKey && compositeCode) {
      // For composite keys, still resolve branch ID to pass to the backend for filtering
      resolvedBranchId = await getBranchIdByCodeOrQuery(compositeCode, compositeCategory);
    }

    if (resolvedBranchId) {
      forwardParams.branchId = resolvedBranchId.toString();
    }

    const targetImporterPath = forwardParams.importer || "all";
    const targetUrl = `${IMPORT_API_BASE_URL}/${encodeURIComponent(year)}/jobs/${encodeURIComponent(status)}/${encodeURIComponent(detailedStatus)}/${encodeURIComponent(customHouse)}/${encodeURIComponent(targetImporterPath)}`;

    console.log(`[Import Proxy] Calling target listing: ${targetUrl}`);

    const response = await axios.get(targetUrl, {
      params: forwardParams,
      headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
      timeout: 30000,
    });

    let jobs = response.data?.data || [];

    // Filter by assigned IE codes for regular users
    if (!isAdmin) {
      const allowedIECodes = new Set(ieCodeAssignments.map((a) => a.ie_code_no.toUpperCase().trim()));
      const allowedImporterNames = new Set(
        ieCodeAssignments.map((a) => formatImporter(a.importer_name)).filter(Boolean)
      );

      jobs = jobs.filter((j) => {
        const jIec = (j.ie_code_no || "").toUpperCase().trim();
        if (jIec && allowedIECodes.has(jIec)) {
          return true;
        }

        // Fallback to match by importer name if ie_code_no is not populated on the job object
        const jImporter = formatImporter(j.importer);
        return allowedImporterNames.has(jImporter);
      });
    }

    // Apply mode filter (Sea / Air) in-memory
    if (isModeOnlyFilter) {
      const modeValue = branchFilterQuery === SEA_MODE_KEY ? "sea" : "air";
      jobs = jobs.filter((j) => {
        // j.mode stores the transport mode, falling back to type_of_b_e if missing
        const jobMode = (j.mode || j.type_of_b_e || "").toLowerCase();
        return jobMode === modeValue;
      });
    } else if (isCompositeKey) {
      // Filter by both branch code AND transport mode
      const filterCode = (compositeCode || "").toUpperCase().trim();
      const filterMode = (compositeCategory || "SEA").toLowerCase();
      jobs = jobs.filter((j) => {
        const jCode = (j.branch_code || j.branch_info?.branch_code || "").toUpperCase().trim();
        const jMode = (j.mode || j.type_of_b_e || "").toLowerCase();
        return jCode === filterCode && jMode === filterMode;
      });
    } else {
      // Filter by branch code dynamically in-memory
      let filterBranchCode = null;
      if (resolvedBranchId) {
        const branchesCol = mongoose.connection.db.collection("branches");
        const branchDoc = await branchesCol.findOne({ _id: resolvedBranchId });
        if (branchDoc) {
          filterBranchCode = branchDoc.branch_code;
        }
      } else if (isGandhidham) {
        filterBranchCode = "GIM";
      }

      if (filterBranchCode) {
        jobs = jobs.filter((j) => {
          const jCode = (j.branch_code || "").toUpperCase().trim();
          const jInfoCode = (j.branch_info?.branch_code || "").toUpperCase().trim();
          return jCode === filterBranchCode || jInfoCode === filterBranchCode;
        });
      }
    }

    // Specific importer filter from route param
    if (importer && importer.toLowerCase() !== "all") {
      const cleanImporter = formatImporter(importer);
      jobs = jobs.filter((j) => formatImporter(j.importer) === cleanImporter);
    }

    // Paginate in memory
    const totalCount = jobs.length;
    const itemsPerPage = parseInt(limit, 10);
    const currentPageNum = parseInt(page, 10);
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    const startIndex = (currentPageNum - 1) * itemsPerPage;
    const paginatedJobs = jobs.slice(startIndex, startIndex + itemsPerPage);

    res.json({
      message: "Jobs fetched successfully",
      data: paginatedJobs,
      total: totalCount,
      currentPage: currentPageNum,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error("Proxy import listing error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: "Failed to fetch jobs from third-party API.",
      details: error.response?.data || error.message,
    });
  }
};

/**
 * PATCH /api/jobs/:id
 */
export const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const response = await axios.patch(`${IMPORT_API_BASE_URL}/jobs/${id}`, updateData, {
      headers: {
        username: req.headers["username"] || "Admin",
        "x-username": req.headers["x-username"] || "Admin",
        "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET
      },
      timeout: 15000,
    });

    res.json(response.data);
  } catch (error) {
    console.error("Proxy update job error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to update job via third-party API." });
  }
};

/**
 * PATCH /api/jobs/container/:id
 */
export const updateContainerTransporter = async (req, res) => {
  try {
    const { id } = req.params;
    const { containerIndex, transporter } = req.body;

    if (containerIndex === undefined) {
      return res.status(400).json({ message: "Container index is required" });
    }

    // Map container index update to dot notation standard PATCH update on the third-party API
    const updatePayload = {
      [`container_nos.${containerIndex}.transporter`]: transporter,
    };

    const response = await axios.patch(`${IMPORT_API_BASE_URL}/jobs/${id}`, updatePayload, {
      headers: {
        username: req.headers["username"] || "Admin",
        "x-username": req.headers["x-username"] || "Admin",
        "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET
      },
      timeout: 15000,
    });

    res.json(response.data);
  } catch (error) {
    console.error("Proxy update container transporter error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to update container transporter." });
  }
};

/**
 * GET /api/container-summary
 * GET /api/gandhidham/container-summary
 */
export const getContainerSummary = async (req, res) => {
  try {
    const { year, ie_codes, branchId, branch } = req.query;
    const isGandhidham = req.path.includes("/gandhidham/");
    const targetBranch = branchId || branch || (isGandhidham ? "GIM" : undefined);

    const response = await axios.get(`${IMPORT_API_BASE_URL}/container-summary`, {
      params: { year, ie_codes, branchId: targetBranch },
      headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
      timeout: 15000,
    });
    res.json(response.data);
  } catch (error) {
    console.error("Proxy getContainerSummary error:", error.message);
    res.status(error.response?.status || 500).json(
      error.response?.data || { error: "Failed to fetch container summary from third-party API." }
    );
  }
};

/**
 * GET /api/container-details
 * GET /api/gandhidham/container-details
 */
export const getContainerDetails = async (req, res) => {
  try {
    const { year, status, size, ie_codes, branchId, branch } = req.query;
    const isGandhidham = req.path.includes("/gandhidham/");
    const targetBranch = branchId || branch || (isGandhidham ? "GIM" : undefined);

    const response = await axios.get(`${IMPORT_API_BASE_URL}/container-details`, {
      params: { year, status, size, ie_codes, branchId: targetBranch },
      headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
      timeout: 15000,
    });
    res.json(response.data);
  } catch (error) {
    console.error("Proxy getContainerDetails error:", error.message);
    res.status(error.response?.status || 500).json(
      error.response?.data || { error: "Failed to fetch container details from third-party API." }
    );
  }
};

/**
 * GET /api/get-exporters
 * GET /api/gandhidham/get-exporters
 */
export const getExporters = async (req, res) => {
  try {
    const { importer, year, status, branch } = req.query;
    const isGandhidham = req.path.includes("/gandhidham/");
    const targetBranch = branch || (isGandhidham ? "GIM" : undefined);

    // When no specific importer is given (e.g., "All Importers" or admin user),
    // pass a wildcard regex so the target returns exporters for all importers.
    const importerParam =
      !importer || importer === "All Importers" || importer === "all"
        ? ".*"
        : importer;

    const response = await axios.get(`${IMPORT_API_BASE_URL}/get-exporters`, {
      params: { importer: importerParam, year, status, branch: targetBranch },
      headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
      timeout: 15000,
    });
    res.json(response.data);
  } catch (error) {
    console.error("Proxy getExporters error:", error.message);
    res.status(error.response?.status || 500).json(
      error.response?.data || { error: "Failed to fetch exporters from third-party API." }
    );
  }
};

/**
 * GET /api/get-years
 */
export const getYears = async (req, res) => {
  try {
    const response = await axios.get(`${IMPORT_API_BASE_URL}/get-years`, {
      headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
      timeout: 10000,
    });
    res.json(response.data);
  } catch (error) {
    console.error("Proxy get years error:", error.message);
    res.status(500).json({ error: "Failed to fetch years." });
  }
};

/**
 * GET /api/get-importer-users
 */
export const getImporterUsers = async (req, res) => {
  try {
    const { importerName } = req.query;
    if (!importerName) {
      return res.status(400).json({ error: "Importer name is required" });
    }

    const users = await EximclientUser.find({
      "ie_code_assignments.importer_name": importerName,
    }).select("username first_name last_name");

    const userNames = users.map((u) => {
      const nameParts = [];
      if (u.first_name) nameParts.push(u.first_name);
      if (u.last_name) nameParts.push(u.last_name);
      return nameParts.length > 0 ? nameParts.join(" ") : u.username;
    });

    userNames.sort();
    res.json(userNames);
  } catch (error) {
    console.error("Get importer users error:", error);
    res.status(500).json({ error: "Failed to fetch assigned users" });
  }
};

/**
 * GET /api/get-job-numbers/multiple
 * GET /api/gandhidham/get-job-numbers/multiple
 */
export const getJobNumbersByMultipleIECodes = async (req, res) => {
  try {
    const { ieCodes, year, search, branch } = req.query;
    const isGandhidham = req.path.includes("/gandhidham/");
    const targetBranch = branch || (isGandhidham ? "GIM" : undefined);

    const response = await axios.get(`${IMPORT_API_BASE_URL}/get-job-numbers/multiple`, {
      params: { ieCodes, year, search, branch: targetBranch },
      headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
      timeout: 15000,
    });
    res.json(response.data);
  } catch (error) {
    console.error("Proxy getJobNumbersByMultipleIECodes error:", error.message);
    res.status(error.response?.status || 500).json(
      error.response?.data || { error: "Failed to fetch job numbers from third-party API." }
    );
  }
};

/**
 * GET /api/get-be-numbers/multiple
 * GET /api/gandhidham/get-be-numbers/multiple
 */
export const getBeNumbersByMultipleIECodes = async (req, res) => {
  try {
    const { ieCodes, year, search, branch } = req.query;
    const isGandhidham = req.path.includes("/gandhidham/");
    const targetBranch = branch || (isGandhidham ? "GIM" : undefined);

    const response = await axios.get(`${IMPORT_API_BASE_URL}/get-be-numbers/multiple`, {
      params: { ieCodes, year, search, branch: targetBranch },
      headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
      timeout: 15000,
    });
    res.json(response.data);
  } catch (error) {
    console.error("Proxy getBeNumbersByMultipleIECodes error:", error.message);
    res.status(error.response?.status || 500).json(
      error.response?.data || { error: "Failed to fetch BE numbers from third-party API." }
    );
  }
};

/**
 * GET /api/lookup/:hsCode/:jobNo/:year
 * GET /api/lookup/:jobNo/:year
 * GET /api/gandhidham/lookup/:jobNo/:year
 */
export const lookup = async (req, res) => {
  try {
    const { hsCode, jobNo, year } = req.params;
    const { ie_code_nos, branch } = req.query;
    const isGandhidham = req.path.includes("/gandhidham/");
    const targetBranch = branch || (isGandhidham ? "GIM" : undefined);

    let url;
    if (hsCode && jobNo && year) {
      url = `${IMPORT_API_BASE_URL}/lookup/${encodeURIComponent(hsCode)}/${encodeURIComponent(jobNo)}/${encodeURIComponent(year)}`;
    } else {
      const actualJobNo = hsCode ? jobNo : req.params.jobNo;
      const actualYear = hsCode ? year : req.params.year;
      url = `${IMPORT_API_BASE_URL}/lookup/${encodeURIComponent(actualJobNo)}/${encodeURIComponent(actualYear)}`;
    }

    const response = await axios.get(url, {
      params: { ie_code_nos, branch: targetBranch },
      headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
      timeout: 15000,
    });
    res.json(response.data);
  } catch (error) {
    console.error("Proxy lookup error:", error.message);
    res.status(error.response?.status || 500).json(
      error.response?.data || { error: "Failed to lookup from third-party API." }
    );
  }
};

/**
 * POST /api/store-calculator-data/:jobNo
 * POST /api/gandhidham/store-calculator-data/:jobNo
 */
export const storeCalculatorData = async (req, res) => {
  try {
    const { jobNo } = req.params;
    const { year, branch } = req.query;
    const isGandhidham = req.path.includes("/gandhidham/");
    const targetBranch = branch || (isGandhidham ? "GIM" : undefined);

    const response = await axios.post(`${IMPORT_API_BASE_URL}/store-calculator-data/${encodeURIComponent(jobNo)}`, req.body, {
      params: { year, branch: targetBranch },
      headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
      timeout: 15000,
    });
    res.json(response.data);
  } catch (error) {
    console.error("Proxy storeCalculatorData error:", error.message);
    res.status(error.response?.status || 500).json(
      error.response?.data || { error: "Failed to store calculator data via third-party API." }
    );
  }
};

/**
 * PATCH /api/update-per-kg-cost
 * PATCH /api/gandhidham/update-per-kg-cost
 */
export const updatePerKgCost = async (req, res) => {
  try {
    const { year, branch } = req.query;
    const isGandhidham = req.path.includes("/gandhidham/");
    const targetBranch = branch || (isGandhidham ? "GIM" : undefined);

    const response = await axios.patch(`${IMPORT_API_BASE_URL}/update-per-kg-cost`, req.body, {
      params: { year, branch: targetBranch },
      headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
      timeout: 15000,
    });
    res.json(response.data);
  } catch (error) {
    console.error("Proxy updatePerKgCost error:", error.message);
    res.status(error.response?.status || 500).json(
      error.response?.data || { error: "Failed to update per kg cost via third-party API." }
    );
  }
};

/**
 * PATCH /api/update-job-duty-weight/:jobNo
 * PATCH /api/gandhidham/update-job-duty-weight/:jobNo
 */
export const updateJobDutyAndWeight = async (req, res) => {
  try {
    const { jobNo } = req.params;
    const { year, branch } = req.query;
    const isGandhidham = req.path.includes("/gandhidham/");
    const targetBranch = branch || (isGandhidham ? "GIM" : undefined);

    const response = await axios.patch(`${IMPORT_API_BASE_URL}/update-job-duty-weight/${encodeURIComponent(jobNo)}`, req.body, {
      params: { year, branch: targetBranch },
      headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
      timeout: 15000,
    });
    res.json(response.data);
  } catch (error) {
    console.error("Proxy updateJobDutyAndWeight error:", error.message);
    res.status(error.response?.status || 500).json(
      error.response?.data || { error: "Failed to update job duty and weight via third-party API." }
    );
  }
};

/**
 * GET /api/get-duties/:job_no
 */
export const getduty = async (req, res) => {
  try {
    const { job_no } = req.params;
    const response = await axios.get(`${IMPORT_API_BASE_URL}/get-duties/${encodeURIComponent(job_no)}`, {
      headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
      timeout: 15000,
    });
    res.json(response.data);
  } catch (error) {
    console.error("Proxy getduty error:", error.message);
    res.status(error.response?.status || 500).json(
      error.response?.data || { error: "Failed to fetch duties from third-party API." }
    );
  }
};

/**
 * GET /api/get-branches
 * Returns all active branches including category (SEA/AIR).
 * Branches with the same city but different modes appear as separate entries.
 */
export const getBranches = async (req, res) => {
  try {
    const response = await axios.get(`${IMPORT_API_BASE_URL}/admin/get-branches`, {
      headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
      timeout: 10000,
    });

    // Include category in each branch entry so Sea/Air can be shown distinctly
    const branches = (response.data || []).filter(b => b.is_active !== false).map(b => ({
      _id: b._id,
      branch_name: b.branch_name,
      branch_code: b.branch_code,
      category: b.category || "SEA",  // SEA or AIR
    }));

    res.json(branches);
  } catch (error) {
    console.error("Proxy get branches error:", error.message);
    try {
      const branchesCol = mongoose.connection.db.collection("branches");
      const branches = await branchesCol.find({ is_active: true }).toArray();
      const result = branches.map(b => ({
        _id: b._id,
        branch_name: b.branch_name,
        branch_code: b.branch_code,
        category: b.category || "SEA",
      }));
      res.json(result);
    } catch (dbErr) {
      res.status(500).json({ error: "Failed to fetch branches." });
    }
  }
};


/**
 * GET /api/get-job-numbers/:ie_code_no
 */
export const getJobNumbersByIECode = async (req, res) => {
  try {
    const { ie_code_no } = req.params;
    const { year, search, branch } = req.query;

    const response = await axios.get(`${IMPORT_API_BASE_URL}/get-job-numbers/multiple`, {
      params: { ieCodes: ie_code_no, year, search, branch },
      headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
      timeout: 15000,
    });

    const jobs = response.data?.data || [];
    const formatted = jobs.map((job) => ({
      job_no: job.job_no,
      year: job.year,
      job_date: job.job_date,
      supplier_exporter: job.supplier_exporter || "N/A",
    }));

    res.json({
      success: true,
      message: `Found ${jobs.length} job(s) for IE code: ${ie_code_no}`,
      data: formatted,
      total_count: jobs.length,
    });
  } catch (error) {
    console.error("Proxy getJobNumbersByIECode error:", error.message);
    res.status(500).json({ success: false, message: "Error fetching job numbers", error: error.message });
  }
};

/**
 * GET /api/optimized/:year/jobs/:ieCode/:status
 */
export const getJobsByIECode = async (req, res) => {
  try {
    const { year, ieCode, status } = req.params;
    const { page, limit, search } = req.query;

    const response = await axios.get(
      `${IMPORT_API_BASE_URL}/optimized/${encodeURIComponent(year)}/jobs/${encodeURIComponent(ieCode)}/${encodeURIComponent(status)}`,
      {
        params: { page, limit, search },
        headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
        timeout: 25000,
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Proxy getJobsByIECode error:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch job data from third-party API." });
  }
};

/**
 * GET /api/optimized/:year/jobs/:ieCode/all
 */
export const getJobsMultiStatus = async (req, res) => {
  try {
    const { year, ieCode } = req.params;
    const { page, limit, search } = req.query;

    const response = await axios.get(
      `${IMPORT_API_BASE_URL}/optimized/${encodeURIComponent(year)}/jobs/${encodeURIComponent(ieCode)}/all`,
      {
        params: { page, limit, search },
        headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
        timeout: 25000,
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Proxy getJobsMultiStatus error:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch job data from third-party API." });
  }
};

/**
 * GET /api/user-dashboard-stats
 */
export const getUserDashboardStats = async (req, res) => {
  try {
    const { importer, date, startDate, endDate } = req.query;
    const user = req.user;

    const dbUser = await EximclientUser.findById(user.id || user._id)
      .select("ie_code_assignments role assignedImporterName")
      .lean();

    if (!dbUser) {
      return res.status(401).json({ success: false, message: "User not found." });
    }

    const isAdmin = dbUser.role === "admin" || dbUser.role === "super_admin" || dbUser.role === "superadmin";

    let targetImporters = null;

    if (!isAdmin) {
      const assignments = dbUser.ie_code_assignments || [];
      let assignedNames = assignments.map((a) => a.importer_name);

      if (assignedNames.length === 0 && dbUser.assignedImporterName) {
        assignedNames = [dbUser.assignedImporterName];
      }

      if (assignedNames.length === 0) {
        return res.json({ summary: {}, details: {} });
      }

      if (importer) {
        const requested = importer.split(",");
        targetImporters = requested.filter((name) => assignedNames.includes(name));
      } else {
        targetImporters = assignedNames;
      }

      if (targetImporters.length === 0) {
        return res.json({ summary: {}, details: {} });
      }
    } else {
      if (importer) {
        targetImporters = importer.split(",");
      }
    }

    const response = await axios.get(`${IMPORT_API_BASE_URL}/user-dashboard-stats`, {
      params: {
        importer: targetImporters ? targetImporters.join(",") : undefined,
        date,
        startDate,
        endDate
      },
      headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
      timeout: 20000
    });

    res.json(response.data);
  } catch (error) {
    console.error("Proxy getUserDashboardStats error:", error.message);
    res.status(500).json({ error: "Failed to fetch user dashboard stats from third-party API." });
  }
};

/**
 * GET /api/get-jobs-overview/:year
 */
export const getJobsOverview = async (req, res) => {
  try {
    const { year } = req.params;
    const { status, search, importer, branch, branchId } = req.query;
    const user = req.user;

    const dbUser = await EximclientUser.findById(user.id || user._id)
      .select("ie_code_assignments role assignedImporterName")
      .lean();

    if (!dbUser) {
      return res.status(401).json({ success: false, message: "User not found." });
    }

    const isAdmin = dbUser.role === "admin" || dbUser.role === "super_admin" || dbUser.role === "superadmin";

    let targetImporters = null;

    if (!isAdmin) {
      const assignments = dbUser.ie_code_assignments || [];
      let assignedNames = assignments.map((a) => a.importer_name);

      if (assignedNames.length === 0 && dbUser.assignedImporterName) {
        assignedNames = [dbUser.assignedImporterName];
      }

      if (assignedNames.length === 0) {
        return res.json({
          pendingJobs: 0,
          completedJobs: 0,
          cancelledJobs: 0,
          totalJobs: 0,
        });
      }

      if (importer) {
        const requested = importer.split(",");
        targetImporters = requested.filter((name) => assignedNames.includes(name));
      } else {
        targetImporters = assignedNames;
      }

      if (targetImporters.length === 0) {
        return res.json({
          pendingJobs: 0,
          completedJobs: 0,
          cancelledJobs: 0,
          totalJobs: 0,
        });
      }
    } else {
      if (importer) {
        targetImporters = importer.split(",");
      }
    }

    const response = await axios.get(`${IMPORT_API_BASE_URL}/analytics/get-jobs-overview/${encodeURIComponent(year)}`, {
      params: {
        status,
        search,
        importer: targetImporters ? targetImporters.join(",") : undefined,
        branch,
        branchId
      },
      headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
      timeout: 20000
    });

    res.json(response.data);
  } catch (error) {
    console.error("Proxy getJobsOverview error:", error.message);
    res.status(500).json({ error: "Failed to fetch job overview from third-party API." });
  }
};

/**
 * GET /api/get-hs-codes
 */
export const getHsCodes = async (req, res) => {
  try {
    const { importer, year, status } = req.query;

    const response = await axios.get(`${IMPORT_API_BASE_URL}/get-hs-codes`, {
      params: { importer, year, status },
      headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
      timeout: 15000,
    });

    res.json(response.data);
  } catch (error) {
    console.error("Proxy getHsCodes error:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch HS codes from third-party API." });
  }
};

/**
 * GET /api/get-suppliers
 */
export const getSuppliers = async (req, res) => {
  try {
    const { importer, year, status } = req.query;

    const response = await axios.get(`${IMPORT_API_BASE_URL}/get-suppliers`, {
      params: { importer, year, status },
      headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
      timeout: 15000,
    });

    res.json(response.data);
  } catch (error) {
    console.error("Proxy getSuppliers error:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch suppliers from third-party API." });
  }
};

/**
 * GET /api/get-importer-list/:year
 */
export const getImporterList = async (req, res) => {
  try {
    const { year } = req.params;
    const response = await axios.get(
      `${IMPORT_API_BASE_URL}/get-importer-list/${encodeURIComponent(year)}`,
      {
        headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
        timeout: 15000,
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Proxy getImporterList error:", error.message);
    res.status(500).json({ error: "Failed to fetch importer list from third-party API." });
  }
};

/**
 * GET /api/download-report/:yearString/:importer/:status
 */
export const downloadReport = async (req, res) => {
  try {
    const { yearString, importer, status } = req.params;
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const dbUser = await EximclientUser.findById(user.id || user._id)
      .select("ie_code_assignments role")
      .lean();

    if (!dbUser) {
      return res.status(401).json({ success: false, message: "User not found." });
    }

    const isAdmin = dbUser.role === "admin" || dbUser.role === "super_admin" || dbUser.role === "superadmin";
    const ieCodeAssignments = dbUser.ie_code_assignments || [];

    const response = await axios.get(
      `${IMPORT_API_BASE_URL}/download-report/${encodeURIComponent(yearString)}/${encodeURIComponent(importer)}/${encodeURIComponent(status)}`,
      {
        headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
        timeout: 30000,
      }
    );

    let jobs = response.data || [];

    if (!isAdmin) {
      const allowedIECodes = new Set(ieCodeAssignments.map((a) => a.ie_code_no.toUpperCase().trim()));
      const allowedImporterNames = new Set(
        ieCodeAssignments.map((a) => formatImporter(a.importer_name)).filter(Boolean)
      );

      jobs = jobs.filter((j) => {
        const jIec = (j.ie_code_no || "").toUpperCase().trim();
        if (jIec && allowedIECodes.has(jIec)) {
          return true;
        }
        const jImporter = formatImporter(j.importer);
        return allowedImporterNames.has(jImporter);
      });
    }

    res.json(jobs);
  } catch (error) {
    console.error("Proxy downloadReport error:", error.message);
    res.status(500).json({ error: "Failed to download report from third-party API." });
  }
};

/**
 * GET /api/download-report/:yearString/:status
 */
export const downloadAllReport = async (req, res) => {
  try {
    const { yearString, status } = req.params;
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const dbUser = await EximclientUser.findById(user.id || user._id)
      .select("ie_code_assignments role")
      .lean();

    if (!dbUser) {
      return res.status(401).json({ success: false, message: "User not found." });
    }

    const isAdmin = dbUser.role === "admin" || dbUser.role === "super_admin" || dbUser.role === "superadmin";
    const ieCodeAssignments = dbUser.ie_code_assignments || [];

    const response = await axios.get(
      `${IMPORT_API_BASE_URL}/download-report/${encodeURIComponent(yearString)}/${encodeURIComponent(status)}`,
      {
        headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
        timeout: 30000,
      }
    );

    let jobs = response.data || [];

    if (!isAdmin) {
      const allowedIECodes = new Set(ieCodeAssignments.map((a) => a.ie_code_no.toUpperCase().trim()));
      const allowedImporterNames = new Set(
        ieCodeAssignments.map((a) => formatImporter(a.importer_name)).filter(Boolean)
      );

      jobs = jobs.filter((j) => {
        const jIec = (j.ie_code_no || "").toUpperCase().trim();
        if (jIec && allowedIECodes.has(jIec)) {
          return true;
        }
        const jImporter = formatImporter(j.importer);
        return allowedImporterNames.has(jImporter);
      });
    }

    res.json(jobs);
  } catch (error) {
    console.error("Proxy downloadAllReport error:", error.message);
    res.status(500).json({ error: "Failed to download report from third-party API." });
  }
};

