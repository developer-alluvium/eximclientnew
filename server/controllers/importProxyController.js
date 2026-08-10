import axios from "axios";
import mongoose from "mongoose";
import EximclientUser from "../models/eximclientUserModel.js";
import JobModel from "../models/jobModel.js";

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
    const shouldFilterByIE = ieCodeAssignments.length > 0;

    if (!isAdmin && !shouldFilterByIE) {
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

    if (shouldFilterByIE) {
      // Restrict to assigned IE codes and importer names (for non-admins or admins with assignments)
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
    } else {
      // Admins without explicit IE code assignments can view all
      if (importer && importer.toLowerCase() !== "all") {
        forwardParams.importer = importer;
      }
      const clientIeCodes = req.query.ieCodes || req.query.ie_codes;
      if (clientIeCodes) {
        forwardParams.ieCodes = clientIeCodes;
        forwardParams.ie_codes = clientIeCodes;
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

    // Filter by assigned IE codes when assignments exist (for non-admins or admins with assigned IE codes)
    if (shouldFilterByIE) {
      const allowedIECodes = new Set(ieCodeAssignments.map((a) => a.ie_code_no.toUpperCase().trim()));
      const allowedImporterNames = new Set(
        ieCodeAssignments.map((a) => formatImporter(a.importer_name)).filter(Boolean)
      );

      jobs = jobs.filter((j) => {
        const jIec = (j.ie_code_no || "").toUpperCase().trim();
        if (jIec && allowedIECodes.has(jIec)) {
          const assignment = ieCodeAssignments.find((a) => a.ie_code_no.toUpperCase().trim() === jIec);
          if (assignment && assignment.exporter_filter) {
            const filterKeyword = assignment.exporter_filter.toLowerCase().trim();
            const jImporter = (j.importer || j.importer_name || "").toLowerCase();
            const jAddress = (typeof j.importer_address === 'string' ? j.importer_address : JSON.stringify(j.importer_address || {})).toLowerCase();
            return jImporter.includes(filterKeyword) || jAddress.includes(filterKeyword);
          }
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

    // Enrich paginated jobs with product_value, invoice_details, and description_details from MongoDB if missing
    if (paginatedJobs.length > 0) {
      try {
        const jobIds = paginatedJobs.map((j) => j._id).filter(Boolean);
        const objectIds = jobIds.map((id) => {
          try {
            return typeof id === "string" && id.length === 24 ? new mongoose.Types.ObjectId(id) : id;
          } catch (e) {
            return id;
          }
        });

        const jobsCol = mongoose.connection.db.collection("jobs");
        const dbJobs = await jobsCol
          .find(
            { $or: [{ _id: { $in: objectIds } }, { _id: { $in: jobIds } }, { job_no: { $in: paginatedJobs.map((j) => j.job_no).filter(Boolean) } }] },
            { projection: { _id: 1, job_no: 1, product_value: 1, invoice_details: 1, description_details: 1, freight: 1, insurance: 1, other_charges: 1, etd: 1, etd_date: 1, etdDate: 1, checklist: 1, is_checklist_aprroved: 1, is_checklist_clicked: 1, is_checklist_aprroved_date: 1, remark_client: 1, do_shipping_line_invoice: 1, charges: 1, shipping_line_invoice_imgs: 1, po_no: 1, po_number: 1, po_date: 1, po_details: 1, reason_for_delay: 1, reasonForDelay: 1, delay_reason: 1, delayReason: 1, reason_of_delay: 1 } }
          )
          .toArray();

        const dbJobMap = new Map();
        dbJobs.forEach((dbJ) => {
          if (dbJ._id) dbJobMap.set(dbJ._id.toString(), dbJ);
          if (dbJ.job_no) dbJobMap.set(dbJ.job_no.toString(), dbJ);
        });

        paginatedJobs.forEach((j) => {
          const dbJ = dbJobMap.get(j._id?.toString()) || dbJobMap.get(j.job_no?.toString());
          if (dbJ) {
            if (!j.product_value && dbJ.product_value) j.product_value = dbJ.product_value;
            if ((!j.invoice_details || (Array.isArray(j.invoice_details) && j.invoice_details.length === 0)) && dbJ.invoice_details) {
              j.invoice_details = dbJ.invoice_details;
            }
            if ((!j.description_details || (Array.isArray(j.description_details) && j.description_details.length === 0)) && dbJ.description_details) {
              j.description_details = dbJ.description_details;
            }
            if (!j.freight && dbJ.freight) j.freight = dbJ.freight;
            if (!j.insurance && dbJ.insurance) j.insurance = dbJ.insurance;
            if (!j.other_charges && dbJ.other_charges) j.other_charges = dbJ.other_charges;
            if (!j.etd && dbJ.etd) j.etd = dbJ.etd;
            if (!j.etd_date && dbJ.etd_date) j.etd_date = dbJ.etd_date;
            if (!j.etdDate && dbJ.etdDate) j.etdDate = dbJ.etdDate;
            if (!j.checklist && dbJ.checklist) j.checklist = dbJ.checklist;
            if (j.is_checklist_aprroved === undefined && dbJ.is_checklist_aprroved !== undefined) j.is_checklist_aprroved = dbJ.is_checklist_aprroved;
            if (j.is_checklist_clicked === undefined && dbJ.is_checklist_clicked !== undefined) j.is_checklist_clicked = dbJ.is_checklist_clicked;
            if (!j.is_checklist_aprroved_date && dbJ.is_checklist_aprroved_date) j.is_checklist_aprroved_date = dbJ.is_checklist_aprroved_date;
            if (!j.remark_client && dbJ.remark_client) j.remark_client = dbJ.remark_client;
            if (!j.po_no && dbJ.po_no) j.po_no = dbJ.po_no;
            if (!j.po_number && dbJ.po_number) j.po_number = dbJ.po_number;
            if (!j.po_date && dbJ.po_date) j.po_date = dbJ.po_date;
            if (!j.po_details && dbJ.po_details) j.po_details = dbJ.po_details;
            if (!j.reason_for_delay && dbJ.reason_for_delay) j.reason_for_delay = dbJ.reason_for_delay;
            if (!j.reasonForDelay && dbJ.reasonForDelay) j.reasonForDelay = dbJ.reasonForDelay;
            if (!j.delay_reason && dbJ.delay_reason) j.delay_reason = dbJ.delay_reason;
            if (!j.delayReason && dbJ.delayReason) j.delayReason = dbJ.delayReason;
            if (!j.reason_of_delay && dbJ.reason_of_delay) j.reason_of_delay = dbJ.reason_of_delay;
            if ((!j.do_shipping_line_invoice || (Array.isArray(j.do_shipping_line_invoice) && j.do_shipping_line_invoice.length === 0)) && dbJ.do_shipping_line_invoice) {
              j.do_shipping_line_invoice = dbJ.do_shipping_line_invoice;
            }
            if ((!j.charges || (Array.isArray(j.charges) && j.charges.length === 0)) && dbJ.charges) {
              j.charges = dbJ.charges;
            }
            if ((!j.shipping_line_invoice_imgs || (Array.isArray(j.shipping_line_invoice_imgs) && j.shipping_line_invoice_imgs.length === 0)) && dbJ.shipping_line_invoice_imgs) {
              j.shipping_line_invoice_imgs = dbJ.shipping_line_invoice_imgs;
            }
          }
        });
      } catch (err) {
        console.error("Failed to enrich jobs with product_value/invoice_details from DB:", err.message);
      }
    }

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

    // Update in local MongoDB directly for instant reflect
    try {
      const jobsCol = mongoose.connection.db.collection("jobs");
      const objectId = typeof id === "string" && id.length === 24 ? new mongoose.Types.ObjectId(id) : id;
      await jobsCol.updateOne(
        { $or: [{ _id: objectId }, { _id: id }, { job_no: id }] },
        { $set: updateData }
      );
    } catch (e) {
      console.warn("Local DB job update warning:", e.message);
    }

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
    const assignments = dbUser.ie_code_assignments || [];
    let assignedNames = assignments.map((a) => a.importer_name);
    if (assignedNames.length === 0 && dbUser.assignedImporterName) {
      assignedNames = [dbUser.assignedImporterName];
    }

    if (assignedNames.length > 0) {
      if (importer) {
        const requested = importer.split(",");
        targetImporters = requested.filter((name) => assignedNames.includes(name));
      } else {
        targetImporters = assignedNames;
      }

      if (targetImporters.length === 0 && !isAdmin) {
        return res.json({ summary: {}, details: {} });
      }
    } else if (!isAdmin) {
      return res.json({ summary: {}, details: {} });
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
    const overviewAssignments = dbUser.ie_code_assignments || [];
    let overviewAssignedNames = overviewAssignments.map((a) => a.importer_name);
    if (overviewAssignedNames.length === 0 && dbUser.assignedImporterName) {
      overviewAssignedNames = [dbUser.assignedImporterName];
    }

    if (overviewAssignedNames.length > 0) {
      if (importer) {
        const requested = importer.split(",");
        targetImporters = requested.filter((name) => overviewAssignedNames.includes(name));
      } else {
        targetImporters = overviewAssignedNames;
      }

      if (targetImporters.length === 0 && !isAdmin) {
        return res.json({
          pendingJobs: 0,
          completedJobs: 0,
          cancelledJobs: 0,
          totalJobs: 0,
        });
      }
    } else if (!isAdmin) {
      return res.json({
        pendingJobs: 0,
        completedJobs: 0,
        cancelledJobs: 0,
        totalJobs: 0,
      });
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
 * PATCH /api/jobs/container-ewaybill/:id
 */
export const updateContainerEwayBill = async (req, res) => {
  try {
    const { id } = req.params;
    const { updates } = req.body; // Array of { container_no, ewaybill_no }

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, message: "Updates array is required" });
    }

    let job = null;

    // First: Try to find by _id
    if (mongoose.Types.ObjectId.isValid(id)) {
      job = await JobModel.findById(id);
    }

    // Second: If not found, try to find by year and job_no or other unique fields
    if (!job) {
      // Let's first try to fetch the job from the third-party API using this id to get more info to find it in local DB!
      const apiJobResponse = await axios.get(`${IMPORT_API_BASE_URL}/jobs/${id}`, {
        headers: {
          username: "Admin",
          "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET
        },
        timeout: 15000,
      });

      const apiJob = apiJobResponse.data?.data || apiJobResponse.data;
      if (apiJob) {
        // Try to find in local DB using year and job_no (the unique index)
        if (apiJob.year && apiJob.job_no) {
          job = await JobModel.findOne({ year: apiJob.year, job_no: apiJob.job_no });
        }

        // If still not found, upsert the job into local DB
        if (!job) {
          const jobData = { ...apiJob, updatedAt: new Date() };
          // Remove _id if present to avoid issues
          delete jobData._id;
          job = await JobModel.findOneAndUpdate(
            { year: apiJob.year, job_no: apiJob.job_no },
            { $set: jobData },
            { new: true, upsert: true }
          );
        }
      }
    }

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const dbContainers = job.container_nos || [];
    const setQuery = {};

    updates.forEach(u => {
      const cNo = (u.container_no || "").trim().toUpperCase();
      const ewbNo = (u.ewaybill_no || "").trim();
      
      if (!cNo || !ewbNo) return;

      const dbIndex = dbContainers.findIndex(dc => 
        (dc.container_number || dc.container_no || "").trim().toUpperCase() === cNo
      );

      if (dbIndex !== -1) {
        setQuery[`container_nos.${dbIndex}.ewaybill_no`] = ewbNo;
      }
    });

    if (Object.keys(setQuery).length === 0) {
      return res.status(400).json({ success: false, message: "No matching containers found to update" });
    }

    const updatedJob = await JobModel.findByIdAndUpdate(job._id, { $set: setQuery }, { new: true });

    res.json({ success: true, message: "Container E-Way Bill(s) updated successfully", data: updatedJob });
  } catch (error) {
    console.error("Error updating container E-Way Bill in MongoDB:", error);
    res.status(500).json({ success: false, message: "Failed to update container E-Way Bill.", error: error.message });
  }
};

/**
 * GET /api/get-dgft-registers
 */
export const getDgftRegisters = async (req, res) => {
  try {
    const response = await axios.get(`${IMPORT_API_BASE_URL}/get-dgft-registers`, {
      headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
      timeout: 15000,
    });
    res.json(response.data);
  } catch (error) {
    console.error("Proxy getDgftRegisters error:", error.message);
    res.status(500).json({ error: "Failed to fetch DGFT registers." });
  }
};

/**
 * GET /api/get-authorizations-by-iec
 */
export const getAuthorizationsByIec = async (req, res) => {
  try {
    const { iec_no } = req.query;
    const response = await axios.get(`${IMPORT_API_BASE_URL}/get-authorizations-by-iec`, {
      params: { iec_no },
      headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
      timeout: 15000,
    });
    res.json(response.data);
  } catch (error) {
    console.error("Proxy getAuthorizationsByIec error:", error.message);
    res.status(500).json({ error: "Failed to fetch authorizations by IEC." });
  }
};

/**
 * GET /api/get-authorization-by-no
 */
export const getAuthorizationByNo = async (req, res) => {
  try {
    const { authorization_no } = req.query;
    const response = await axios.get(`${IMPORT_API_BASE_URL}/get-authorization-by-no`, {
      params: { authorization_no },
      headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
      timeout: 15000,
    });
    res.json(response.data);
  } catch (error) {
    console.error("Proxy getAuthorizationByNo error:", error.message);
    res.status(500).json({ error: "Failed to fetch authorization by number." });
  }
};

/**
 * GET /api/license-utilization/records
 */
export const getLicenseUtilizationRecords = async (req, res) => {
  try {
    const { authorization_no } = req.query;
    const response = await axios.get(`${IMPORT_API_BASE_URL}/license-utilization/records`, {
      params: { authorization_no },
      headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
      timeout: 15000,
    });
    res.json(response.data);
  } catch (error) {
    console.error("Proxy getLicenseUtilizationRecords error:", error.message);
    res.status(500).json({ error: "Failed to fetch license utilization records." });
  }
};

/**
 * GET /api/get-rodteps
 */
export const getRodteps = async (req, res) => {
  try {
    const response = await axios.get(`${IMPORT_API_BASE_URL}/get-rodteps`, {
      headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
      timeout: 15000,
    });
    res.json(response.data);
  } catch (error) {
    console.error("Proxy getRodteps error:", error.message);
    res.status(500).json({ error: "Failed to fetch RODTEP records." });
  }
};

/**
 * GET /api/get-rodteps-by-iec
 */
export const getRodtepsByIec = async (req, res) => {
  try {
    const { iec_no } = req.query;
    const response = await axios.get(`${IMPORT_API_BASE_URL}/get-rodteps-by-iec`, {
      params: { iec_no },
      headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
      timeout: 15000,
    });
    res.json(response.data);
  } catch (error) {
    console.error("Proxy getRodtepsByIec error:", error.message);
    res.status(500).json({ error: "Failed to fetch RODTEP records by IEC." });
  }
};

/**
 * GET /api/get-rodtep-utilization
 */
export const getRodtepUtilizationProxy = async (req, res) => {
  try {
    const { rodtep } = req.query;
    const response = await axios.get(`${IMPORT_API_BASE_URL}/get-rodtep-utilization`, {
      params: { rodtep },
      headers: { username: "Admin", "x-api-key": process.env.EXIM_API_KEY || process.env.JWT_ACCESS_SECRET },
      timeout: 15000,
    });
    res.json(response.data);
  } catch (error) {
    console.error("Proxy getRodtepUtilization error:", error.message);
    res.status(500).json({ error: "Failed to fetch RODTEP utilization records." });
  }
};


