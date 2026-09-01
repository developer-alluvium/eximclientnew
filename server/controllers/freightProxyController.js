import axios from "axios";
import mongoose from "mongoose";
import EximclientUser from "../models/eximclientUserModel.js";

const FreightModel = mongoose.models.FreightEnquiry || mongoose.model("FreightEnquiry", new mongoose.Schema({}, { strict: false }), "freight_enquiries");

const EXPORT_API_BASE_URL = process.env.EXPORT_API_BASE_URL || "http://localhost:9002/api";

const normalizeOrg = (name) =>
  String(name || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const collectOrgNames = (dbUser) => {
  const names = new Set();
  const importerAssignments = dbUser.ie_code_assignments || [];
  const exporterAssignments = dbUser.exporter_ie_code_assignments || [];

  [...importerAssignments, ...exporterAssignments].forEach((a) => {
    if (a?.importer_name) names.add(a.importer_name);
  });

  return [...names];
};

const enquiryMatchesOrgs = (enquiry, dbUser) => {
  const importerAssignments = dbUser.ie_code_assignments || [];
  const exporterAssignments = dbUser.exporter_ie_code_assignments || [];
  const allAssignments = [...importerAssignments, ...exporterAssignments];

  if (!allAssignments.length) return false;

  const rawCandidates = [
    enquiry.organization_name,
    enquiry.shipper_name,
    enquiry.consignee_name,
    enquiry.bl_details?.consignee,
    enquiry.bl_details?.consignor,
  ].filter(Boolean);

  if (!rawCandidates.length) return false;

  return allAssignments.some((a) => {
    const org = (a.importer_name || "").toUpperCase();
    const filter = (a.exporter_filter || "").toUpperCase();
    const assignIec = (a.ie_code_no || "").toUpperCase();

    return rawCandidates.some((candidateStr) => {
      const cand = candidateStr.toUpperCase();
      if (filter === "MODERN INSULATORS LIMITED" || (assignIec === "1388003881" && !filter.includes("TERRY TOWELS") && !org.includes("TERRY TOWELS"))) {
        return cand.includes("MODERN INSULATORS") && !cand.includes("TERRY TOWELS");
      }
      if (filter.includes("TERRY TOWELS") || org.includes("TERRY TOWELS")) {
        return cand.includes("TERRY TOWELS");
      }
      const normOrg = normalizeOrg(org);
      const normCand = normalizeOrg(cand);
      return normOrg && normCand && (normCand.includes(normOrg) || normOrg.includes(normCand));
    });
  });
};

const isConverted = (e) => e.status === "Converted" || !!e.source_job_no || !!e.success_no;

const getPipelineStage = (e) => {
  if (!isConverted(e)) {
    if (e.status === "Rejected") return "Rejected";
    return "Enquiry";
  }
  const draftApproved = e.draft_bl_approved === true;
  if (!draftApproved) return "Draft BL";
  const sboDate = !!(e.sailing_date);
  if (!sboDate) return "SOB";
  const hasBillingDetails = !!(
    e.billing_details?.agency_bill_no &&
    e.billing_details?.agency_bill_date &&
    e.billing_details?.reimbursement_bill_no &&
    e.billing_details?.reimbursement_bill_date
  );
  if (!hasBillingDetails) return "Billing";
  const hasArrivalDate = !!(e.arrival_date);
  if (!hasArrivalDate) return "ETA Pending";
  const hasFinalDelivery = !!(e.final_delivery_date);
  if (!hasFinalDelivery) return "Delivery";
  return "Completed";
};

const handleExportApiError = (error, res, fallbackMessage) => {
  console.error(fallbackMessage, error?.message || error);

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

  return res.status(500).json({
    success: false,
    message: fallbackMessage,
    error: error.message,
  });
};

/**
 * GET /api/freight-enquiries
 * Proxies freight enquiries and scopes them to the user's assigned importer/exporter orgs.
 */
export const proxyFreightEnquiries = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const dbUser = await EximclientUser.findById(user.id || user._id)
      .select("ie_code_assignments exporter_ie_code_assignments role name email")
      .lean();

    if (!dbUser) {
      return res.status(401).json({ success: false, message: "User not found." });
    }

    const isAdmin =
      dbUser.role === "admin" ||
      dbUser.role === "super_admin" ||
      dbUser.role === "superadmin";

    const hasAssignments = (dbUser.ie_code_assignments?.length > 0) || (dbUser.exporter_ie_code_assignments?.length > 0);

    if (!isAdmin && !hasAssignments) {
      return res.json({ success: true, data: [] });
    }

    let all = [];
    try {
      const response = await axios.get(`${EXPORT_API_BASE_URL}/freight-enquiries`, {
        params: isAdmin ? { tab: req.query.tab } : {}, // Fetch all if not admin to calculate counts properly
        timeout: 30000,
      });
      all = Array.isArray(response.data?.data) ? response.data.data : [];
    } catch (apiErr) {
      console.warn("Remote freight enquiries fetch error, fallback to local DB:", apiErr.message);
    }

    // Ensure all items have computedTab (legacy remote backend might not provide it)
    all.forEach(e => {
      if (!e.computedTab) {
        e.computedTab = getPipelineStage(e);
      }
    });

    let data = [];
    let counts = {};

    if (isAdmin) {
      data = all;
    } else {
      // Filter all jobs by user's assigned orgs
      let orgFilteredData = all.filter((e) => enquiryMatchesOrgs(e, dbUser));

      if (orgFilteredData.length === 0) {
        try {
          const localEnquiries = await FreightModel.find({}).lean();
          orgFilteredData = localEnquiries.filter((e) => enquiryMatchesOrgs(e, orgNames));
          orgFilteredData.forEach(e => {
            if (!e.computedTab) {
              e.computedTab = getPipelineStage(e);
            }
          });
        } catch (dbErr) {
          console.error("Local freight enquiries fallback error:", dbErr.message);
        }
      }

      // Re-tally counts based on org-filtered data
      const PRE_ETA = new Set(["Draft BL", "SOB", "Billing"]);
      const recounted = {
        Enquiry: 0, Rejected: 0, Pending: 0,
        "Draft BL": 0, SOB: 0, Billing: 0,
        "ETA Pending": 0, Delivery: 0, Completed: 0
      };
      orgFilteredData.forEach(e => {
        const ct = e.computedTab || "";
        if (ct === "Enquiry") recounted.Enquiry++;
        else if (ct === "Rejected") recounted.Rejected++;
        else if (ct === "Draft BL") { recounted["Draft BL"]++; recounted.Pending++; }
        else if (ct === "SOB") { recounted.SOB++; recounted.Pending++; }
        else if (ct === "Billing") { recounted.Billing++; recounted.Pending++; }
        else if (ct === "ETA Pending") recounted["ETA Pending"]++;
        else if (ct === "Delivery") recounted.Delivery++;
        else if (ct === "Completed") recounted.Completed++;
      });
      counts = recounted;

      // Now filter by the requested tab
      const reqTab = req.query.tab;
      if (reqTab) {
        if (reqTab === "Pending") {
          data = orgFilteredData.filter(e => PRE_ETA.has(e.computedTab));
        } else {
          data = orgFilteredData.filter(e => e.computedTab === reqTab);
        }
      } else {
        data = orgFilteredData;
      }
    }

    return res.json({
      success: true,
      data,
      counts,
      message: `Found ${data.length} freight enquiry(ies)`,
    });
  } catch (error) {
    return handleExportApiError(error, res, "Failed to fetch freight enquiries.");
  }
};

/**
 * GET /api/export-dsr/historical-freight
 */
export const proxyHistoricalFreight = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const response = await axios.get(`${EXPORT_API_BASE_URL}/export-dsr/historical-freight`, {
      params: req.query,
      timeout: 30000,
    });

    return res.status(response.status).json(response.data);
  } catch (error) {
    return handleExportApiError(error, res, "Failed to fetch historical freight rates.");
  }
};

/**
 * GET /api/ports
 */
export const proxyPorts = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const response = await axios.get(`${EXPORT_API_BASE_URL}/ports`, {
      params: req.query,
      timeout: 15000,
    });

    return res.status(response.status).json(response.data);
  } catch (error) {
    return handleExportApiError(error, res, "Failed to fetch ports.");
  }
};

/**
 * GET /api/freight-forwarding/generate-dsr
 */
export const proxyFreightDsrDownload = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const response = await axios.get(`${EXPORT_API_BASE_URL}/freight-forwarding/generate-dsr`, {
      params: req.query,
      responseType: "arraybuffer",
      timeout: 60000,
    });

    const contentType =
      response.headers["content-type"] ||
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    res.setHeader("Content-Type", contentType);
    if (response.headers["content-disposition"]) {
      res.setHeader("Content-Disposition", response.headers["content-disposition"]);
    }
    return res.status(response.status).send(Buffer.from(response.data));
  } catch (error) {
    if (error.response?.data) {
      try {
        const text = Buffer.from(error.response.data).toString("utf8");
        const parsed = JSON.parse(text);
        return res.status(error.response.status).json(parsed);
      } catch (_) {
        // fall through
      }
    }
    return handleExportApiError(error, res, "Failed to download Freight Forwarding DSR.");
  }
};

/**
 * PUT /api/freight-enquiries/:id
 */
export const proxyUpdateFreightEnquiry = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const response = await axios.put(`${EXPORT_API_BASE_URL}/freight-enquiries/${req.params.id}`, req.body, {
      timeout: 15000,
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    return handleExportApiError(error, res, "Failed to update freight enquiry.");
  }
};
