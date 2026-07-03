import express from "express";
import axios from "axios";
import multer from "multer";
import FormData from "form-data";
import mongoose from "mongoose";
import transportAuthService from "../services/transportAuthService.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const getTargetUrl = () => {
  return process.env.NODE_ENV === "development"
    ? "http://localhost:9007/api/eway-bill"
    : "https://eximbot.alvision.in/transport/api/eway-bill";
};

// Generic proxy handler
const proxyRequest = async (req, res) => {
  try {
    const targetBase = getTargetUrl();
    const targetUrl = `${targetBase}${req.path}`;
    console.log(`📡 [Proxy E-Way Bill] forwarding to: ${targetUrl} with query:`, req.query, "and body:", req.body);
    const serviceToken = await transportAuthService.getServiceToken();

    // Prepare headers
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.connection;
    if (serviceToken) {
      headers.Authorization = `Bearer ${serviceToken}`;
    }

    let response;

    if (req.file) {
      // It's a file upload (multipart/form-data)
      const form = new FormData();
      form.append("file", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });
      
      // Merge other text fields if present
      if (req.body) {
        Object.keys(req.body).forEach(key => {
          form.append(key, req.body[key]);
        });
      }

      response = await axios({
        method: req.method,
        url: targetUrl,
        data: form,
        headers: {
          ...headers,
          ...form.getHeaders()
        },
        params: req.query,
        timeout: 60000,
        validateStatus: () => true
      });
    } else {
      // It's a standard JSON or GET request
      response = await axios({
        method: req.method,
        url: targetUrl,
        data: req.body,
        headers: headers,
        params: req.query,
        timeout: 30000,
        validateStatus: () => true
      });
    }

    if (req.path === "/boe-lr-data" && response.data && response.data.success && response.data.data) {
      const prInfo = response.data.data;
      const document_no = prInfo.document_no;
      if (document_no) {
        try {
          const dbPr = await mongoose.connection.db.collection("prdatas").findOne({
            document_no,
            status: { $ne: "Deleted" }
          });
          if (dbPr && dbPr.containers) {
            prInfo.all_active_containers = prInfo.all_active_containers.map(c => {
              const match = dbPr.containers.find(dc => dc._id.toString() === c._id.toString() || dc.tr_no === c.tr_no);
              if (match) {
                return {
                  ...c,
                  container_number: match.container_number,
                  gross_weight: match.gross_weight,
                  net_weight: match.net_weight,
                  no_of_pkg: match.no_of_pkg,
                };
              }
              return c;
            });
            if (prInfo.container_details) {
              const match = dbPr.containers.find(dc => dc._id.toString() === prInfo.container_details._id.toString() || dc.tr_no === prInfo.container_details.tr_no);
              if (match) {
                prInfo.container_details = {
                  ...prInfo.container_details,
                  container_number: match.container_number,
                  gross_weight: match.gross_weight,
                  net_weight: match.net_weight,
                  no_of_pkg: match.no_of_pkg,
                };
              }
            }
          }
        } catch (dbErr) {
          console.error("Failed to enrich active containers in proxy:", dbErr.message);
        }
      }
    }

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`E-Way Bill proxy error for path ${req.path}:`, error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || error.response?.data || error.message || "E-Way Bill proxy request failed";
    res.status(status).json({ success: false, message });
  }
};

// Middleware to handle multipart requests conditionally
const multipartHandler = (req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    if (req.path === "/boe-upload") {
      return upload.single("file")(req, res, next);
    }
    return upload.none()(req, res, next);
  }
  next();
};

// ── PDF Proxy: fetch external PDF URL server-side and stream back ────────────
// Prevents CORS/encoding issues when the browser tries to fetch cross-origin PDFs.
router.get("/pdf-proxy", async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ success: false, message: "Missing url parameter" });
  }

  let targetUrl = url;
  if (!targetUrl.startsWith("http")) targetUrl = `https://${targetUrl}`;

  try {
    const serviceToken = await transportAuthService.getServiceToken();
    const headers = {};
    if (serviceToken) headers.Authorization = `Bearer ${serviceToken}`;

    const response = await axios.get(targetUrl, {
      responseType: "arraybuffer",
      headers,
      timeout: 30000,
      validateStatus: () => true,
    });

    const contentType = response.headers["content-type"] || "";

    // If the upstream sent an error (JSON), forward it cleanly
    if (response.status !== 200 || (!contentType.includes("pdf") && !contentType.includes("octet"))) {
      let errMsg = "Failed to fetch PDF";
      try {
        const decoded = Buffer.from(response.data).toString("utf8");
        const parsed = JSON.parse(decoded);
        errMsg = parsed.message || parsed.error || errMsg;
      } catch (_) {}
      return res.status(response.status || 502).json({ success: false, message: errMsg });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment");
    res.setHeader("Content-Length", response.data.byteLength);
    res.status(200).end(Buffer.from(response.data));
  } catch (err) {
    console.error("[pdf-proxy] error:", err.message);
    res.status(502).json({ success: false, message: err.message || "PDF proxy failed" });
  }
});

// Define routes
router.use(multipartHandler, proxyRequest);

export default router;
