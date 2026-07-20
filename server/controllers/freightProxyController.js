import axios from "axios";
import EximclientUser from "../models/eximclientUserModel.js";

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

const enquiryMatchesOrgs = (enquiry, orgNames) => {
  if (!orgNames.length) return false;
  const normalizedOrgs = orgNames.map(normalizeOrg).filter(Boolean);
  const candidates = [
    enquiry.organization_name,
    enquiry.shipper_name,
    enquiry.consignee_name,
    enquiry.bl_details?.consignee,
    enquiry.bl_details?.consignor,
  ]
    .filter(Boolean)
    .map(normalizeOrg);

  return candidates.some((c) =>
    normalizedOrgs.some((org) => c.includes(org) || org.includes(c))
  );
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

    const orgNames = collectOrgNames(dbUser);

    if (!isAdmin && orgNames.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const response = await axios.get(`${EXPORT_API_BASE_URL}/freight-enquiries`, {
      timeout: 30000,
    });

    const all = Array.isArray(response.data?.data) ? response.data.data : [];
    const data = isAdmin ? all : all.filter((e) => enquiryMatchesOrgs(e, orgNames));

    return res.json({
      success: true,
      data,
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
