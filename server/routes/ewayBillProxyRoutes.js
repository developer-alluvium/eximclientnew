import express from "express";
import axios from "axios";
import multer from "multer";
import FormData from "form-data";
import mongoose from "mongoose";
import transportAuthService from "../services/transportAuthService.js";
import OtherEwayBill from "../models/otherEwayBillModel.js";
import Job from "../models/jobModel.js";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { authenticateUser } from "../middlewares/authMiddleware.js";
import {
  checkAndBlockCredits,
  finalizeDebit,
  rollbackBlockedCredits,
  addRewardCredits,
  approvePayment,
  adminAdjustCredits,
  setWalletValidity,
  getPricingRule,
  getOrCreateWallet,
  InsufficientCreditsError,
  WalletExpiredError,
} from "../services/walletService.js";
import ClientWallet from "../models/ClientWallet.js";
import CreditLedger from "../models/CreditLedger.js";
import PaymentRequest from "../models/PaymentRequest.js";
import EximclientUser from "../models/eximclientUserModel.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const getTargetUrl = () => {
  if (process.env.TRANSPORT_API_BASE_URL) {
    return `${process.env.TRANSPORT_API_BASE_URL.replace(/\/+$/, '')}/eway-bill`;
  }
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
    if (
      req.path === "/boe-upload" ||
      req.path === "/others/upload-boe" ||
      req.path === "/wallet/payment-request" ||
      req.path === "/wallet/topup"
    ) {
      return upload.any()(req, res, (err) => {
        if (err) return next(err);
        if (Array.isArray(req.files) && req.files.length > 0) {
          req.file =
            req.files.find((f) => f.fieldname === "slipFile" || f.fieldname === "file") ||
            req.files[0];
        }
        next();
      });
    }
    return upload.none()(req, res, next);
  }
  next();
};

// ── PDF Proxy: fetch external PDF URL server-side and stream back ────────────
// Prevents CORS/encoding issues when the browser tries to fetch cross-origin PDFs.
const pdfProxyHandler = async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ success: false, message: "Missing url parameter" });
  }

  let targetUrl = url;
  if (!targetUrl.startsWith("http")) targetUrl = `https://${targetUrl}`;

  try {
    const bucketName = process.env.REACT_APP_S3_BUCKET;
    if (bucketName && targetUrl.includes(bucketName)) {
      // It's our S3 bucket. Extract key.
      const s3Marker = ".amazonaws.com/";
      const markerIndex = targetUrl.indexOf(s3Marker);
      if (markerIndex !== -1) {
        const key = decodeURIComponent(targetUrl.substring(markerIndex + s3Marker.length));
        try {
          const s3Response = await s3.send(new GetObjectCommand({
            Bucket: bucketName,
            Key: key
          }));
          
          res.setHeader("Content-Type", s3Response.ContentType || "application/pdf");
          res.setHeader("Content-Disposition", "attachment");
          if (s3Response.ContentLength) {
            res.setHeader("Content-Length", s3Response.ContentLength);
          }
          
          s3Response.Body.pipe(res);
          return;
        } catch (s3Err) {
          console.error("[pdf-proxy] S3 fetch error:", s3Err.message);
          return res.status(502).json({ success: false, message: `Failed to fetch S3 object: ${s3Err.message}` });
        }
      }
    }

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
};

router.get("/pdf-proxy", authenticateUser, pdfProxyHandler);
router.get("/proxy-pdf", authenticateUser, pdfProxyHandler); // backward compatibility

// Initialize S3 Client
const s3 = new S3Client({
  region: process.env.REACT_APP_AWS_REGION,
  credentials: {
    accessKeyId: process.env.REACT_APP_ACCESS_KEY,
    secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY,
  },
});

// Local Others E-Way Bill Routes
router.post("/others/upload-boe", authenticateUser, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    // File type validation (must be PDF)
    if (req.file.mimetype !== "application/pdf" && !req.file.originalname.toLowerCase().endsWith(".pdf")) {
      return res.status(400).json({ success: false, message: "Invalid file type. Only PDF files are allowed." });
    }

    // File size validation (limit to 10MB)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (req.file.size > MAX_SIZE) {
      return res.status(400).json({ success: false, message: "File is too large. Maximum allowed size is 10MB." });
    }

    const file = req.file;

    // ── STEP 1: Parse the PDF first (before any S3 upload) ────────────────
    const BOE_API_BASE = process.env.BOE_API_BASE_URL || "http://3.108.244.38:8002/api/v1";
    const form = new FormData();
    // Append both 'files' and 'file' so that any parser API parameter signature (List[UploadFile] or UploadFile) matches
    form.append("files", file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });
    form.append("file", file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    console.log(`📡 [Others Upload] Sending file to parser: ${BOE_API_BASE}/upload`);
    const parserResponse = await axios.post(`${BOE_API_BASE}/upload`, form, {
      headers: { ...form.getHeaders() },
      timeout: 60000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const parsedData = parserResponse.data;

    let records = [];
    if (parsedData && parsedData.status === "success" && parsedData.data && typeof parsedData.data === "object" && !Array.isArray(parsedData.data)) {
      if (!parsedData.data.ImporterDetails && !parsedData.data.InvoiceAndItemDetails && !parsedData.data["BE No"] && !parsedData.data.BE_NO) {
        records = Object.values(parsedData.data);
      } else {
        records = [parsedData.data];
      }
    } else if (parsedData) {
      records = Array.isArray(parsedData) ? parsedData : (parsedData.records || parsedData.data || [parsedData]);
    }

    const boeRecord = records[0] || {};
    const boeDetail = boeRecord.data || boeRecord;
    const importerDetails = boeDetail.ImporterDetails || {};
    const invoiceDetails = boeDetail.InvoiceAndItemDetails || {};

    const boeNumber = importerDetails["BE No"] || importerDetails["BE_NO"] || invoiceDetails.BE_NO || invoiceDetails.document_no || boeRecord.documentNumber || "";
    const rawBoeDate = importerDetails["BE Date"] || importerDetails["BE_DATE"] || invoiceDetails.BE_DATE || invoiceDetails.document_date || "";

    const normalizedBoeNumber = (boeNumber || "").toString().trim();
    if (!normalizedBoeNumber) {
      return res.status(422).json({
        success: false,
        message: "Could not extract a valid Bill of Entry Number (BE No) from the provided PDF document. Please verify the file is a readable Bill of Entry.",
      });
    }

    const effectiveClientId = (req.user.adminId?._id || req.user.adminId || req.user._id)?.toString();

    console.log(`📋 [Others Upload] Parsed — boeNumber: "${normalizedBoeNumber}", clientId: ${effectiveClientId}`);

    // ── STEP 2: Duplicate check BEFORE any S3 upload ──────────────────────
    // boeNumber is globally unique in the OtherEwayBill collection (no clientId filter)
    if (normalizedBoeNumber) {
      const existingRecord = await OtherEwayBill.findOne({
        boeNumber: normalizedBoeNumber,
      }).populate("clientId", "name email").lean();

      console.log(`🔍 [Others Upload] Duplicate check: ${existingRecord ? `FOUND existing record (id=${existingRecord._id}, status=${existingRecord.ewayBillStatus})` : "not found — OK to proceed"}`);

      if (existingRecord) {
        const uploadedByName = existingRecord.clientId?.name || "another account";
        return res.status(400).json({
          success: false,
          message: `Bill of Entry ${normalizedBoeNumber} has already been registered by ${uploadedByName}. It cannot be uploaded again.`
        });
      }
    }

    // ── STEP 3: Only now upload to S3 (duplicate cleared) ─────────────────
    const timestamp = Date.now();
    const originalName = file.originalname;
    const extension = originalName.substring(originalName.lastIndexOf("."));
    const baseName = originalName.substring(0, originalName.lastIndexOf("."));
    const uniqueFileName = `${baseName}-${timestamp}${extension}`;
    const key = `others-boe/${uniqueFileName}`;

    const s3Params = {
      Bucket: process.env.REACT_APP_S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    };
    await s3.send(new PutObjectCommand(s3Params));
    const s3Url = `https://${process.env.REACT_APP_S3_BUCKET}.s3.${process.env.REACT_APP_AWS_REGION}.amazonaws.com/${key}`;

    // Parse BOE date
    let boeDate = null;
    if (rawBoeDate) {
      if (rawBoeDate.includes("/")) {
        const parts = rawBoeDate.split("/");
        if (parts.length === 3) {
          const formatted = `${parts[2].length === 2 ? "20" + parts[2] : parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
          const d = new Date(formatted);
          if (!isNaN(d.getTime())) boeDate = d;
        }
      } else {
        const d = new Date(rawBoeDate);
        if (!isNaN(d.getTime())) boeDate = d;
      }
    }

    // ── STEP 4: Try to find matching Job ───────────────────────────────────
    let job = null;
    if (normalizedBoeNumber) {
      try {
        job = await Job.findOne({ be_no: { $regex: new RegExp(`^${normalizedBoeNumber}$`, "i") } });
      } catch (jobErr) {
        console.warn("⚠️ Failed to check matching Job:", jobErr.message);
      }
    }

    // ── STEP 5: Enrich with boe-extract (fetches NIC item details, duties, etc.) ─
    // This data is stored in parsedData and passed as boeData prop to EwayBillGenerate,
    // so the frontend REUSES this saved data and does NOT need to call boe-extract again.
    let enrichedData = boeRecord;
    if (normalizedBoeNumber) {
      try {
        const dateStr = boeDate ? boeDate.toISOString().split("T")[0] : "";
        const serviceToken = await transportAuthService.getServiceToken();
        const targetBase = getTargetUrl();
        console.log(`📡 [Others Upload] Enriching with boe-extract for: ${normalizedBoeNumber} (${dateStr})`);
        const enrichRes = await axios.get(`${targetBase}/boe-extract`, {
          params: { be_no: normalizedBoeNumber, be_date: dateStr },
          headers: serviceToken ? { Authorization: `Bearer ${serviceToken}` } : {},
          timeout: 20000,
        });
        if (enrichRes.data && enrichRes.data.success !== false) {
          enrichedData = enrichRes.data;
          console.log("✅ [Others Upload] boe-extract enrichment successful — data saved to record (no repeat call needed)");
        }
      } catch (enrichErr) {
        console.warn("⚠️ [Others Upload] boe-extract enrichment failed (non-critical):", enrichErr.message);
      }
    }

    const boeDetailForConts = enrichedData?.data || enrichedData || {};
    const containerDetails = boeDetailForConts.ContainerDetails || [];
    const containers = containerDetails.map(bc => {
      const cNo = bc["CONTAINER NUMBER"] || bc.ContainerNo || bc.container_number || bc.CONTR_NO || bc.CONTR || bc.containerNo || "";
      return { containerNumber: cNo.trim(), ewayBillStatus: "Pending" };
    }).filter(c => c.containerNumber);

    // ── STEP 6: Save record ────────────────────────────────────────────────
    const otherEwb = new OtherEwayBill({
      clientId: effectiveClientId,
      uploadedBy: req.user._id,
      jobId: job ? job._id : undefined,
      jobNo: job ? job.job_no : undefined,
      boeNumber: normalizedBoeNumber,
      boeDate,
      pdfUrl: s3Url,
      pdfKey: key,
      parsedData: enrichedData,   // ← Saved here so frontend reuses it; no second boe-extract call needed
      containers,
      ewayBillStatus: "Pending",
    });

    await otherEwb.save();
    res.status(200).json({ success: true, data: otherEwb });
  } catch (error) {
    console.error("Error in others/upload-boe:", error.response?.data || error.message);
    // MongoDB duplicate key error (unique index on clientId + boeNumber)
    if (error.code === 11000) {
      const boe = error.keyValue?.boeNumber || "";
      return res.status(400).json({
        success: false,
        message: `Bill of Entry ${boe} has already been uploaded and is active. Please generate the E-Way Bill from the existing entry in the list.`,
      });
    }

    // Extract detailed error message from upstream parser (FastAPI / axios)
    let errorMessage = "Failed to process BOE upload";
    const status = error.response?.status || 500;

    if (error.response?.data) {
      const data = error.response.data;
      if (typeof data === "string") {
        errorMessage = data;
      } else if (data.detail) {
        if (typeof data.detail === "string") {
          errorMessage = data.detail;
        } else if (Array.isArray(data.detail)) {
          errorMessage = data.detail.map(d => d.msg || `${d.loc ? d.loc.slice(1).join('.') + ': ' : ''}${d.msg || JSON.stringify(d)}`).join(", ");
        } else {
          errorMessage = JSON.stringify(data.detail);
        }
      } else if (data.message) {
        errorMessage = data.message;
      } else if (data.error) {
        errorMessage = typeof data.error === "string" ? data.error : JSON.stringify(data.error);
      } else if (data.results?.message) {
        errorMessage = data.results.message;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(status >= 400 && status < 600 ? status : 500).json({
      success: false,
      message: errorMessage,
      ...(process.env.NODE_ENV === "development" && { stack: error.stack })
    });
  }
});

router.get("/others/list", authenticateUser, async (req, res) => {
  try {
    const effectiveClientId = (req.user.adminId?._id || req.user.adminId || req.user._id)?.toString();
    const query = req.user.role === "superadmin" ? {} : { clientId: effectiveClientId };
    const list = await OtherEwayBill.find(query).sort({ createdAt: -1 });

    // Auto-heal / migrate any legacy records with empty containers array
    let updatedAny = false;
    for (const record of list) {
      if (!record.containers || record.containers.length === 0) {
        const boeDetailForConts = record.parsedData?.data || record.parsedData || {};
        const containerDetails = boeDetailForConts.ContainerDetails || [];
        record.containers = containerDetails.map(bc => {
          const cNo = bc["CONTAINER NUMBER"] || bc.ContainerNo || bc.container_number || bc.CONTR_NO || bc.CONTR || bc.containerNo || "";
          return {
            containerNumber: cNo.trim(),
            ewayBillStatus: "Pending"
          };
        }).filter(c => c.containerNumber);

        // If E-Way Bills were already generated, map them to the initialized containers
        if (record.ewayBillStatus === "Generated" || record.ewayBillStatus === "Partially Generated") {
          const ewbData = record.ewayBillData;
          if (Array.isArray(ewbData)) {
            record.containers = record.containers.map(cont => {
              const result = ewbData.find(r => {
                const rCont = r.container || r.container_number;
                return r.status === "success" && rCont && String(rCont).trim().toUpperCase() === String(cont.containerNumber).trim().toUpperCase();
              });
              if (result) {
                return {
                  ...cont.toObject(),
                  ewayBillNo: String(result.ewbNo),
                  ewayBillDate: result.ewbDate ? new Date(result.ewbDate) : new Date(),
                  ewayBillUrl: result.url || result.pdfUrl,
                  ewayBillStatus: "Generated",
                  ewayBillData: result
                };
              }
              return cont;
            });
          } else if (record.ewayBillNo) {
            record.containers = record.containers.map(cont => ({
              ...cont.toObject(),
              ewayBillNo: record.ewayBillNo,
              ewayBillDate: record.ewayBillDate,
              ewayBillUrl: record.ewayBillUrl,
              ewayBillStatus: "Generated",
              ewayBillData: record.ewayBillData
            }));
          }

          // Update parent ewayBill details for consistency
          const firstActive = record.containers.find(c => c.ewayBillStatus === "Generated");
          if (firstActive) {
            record.ewayBillNo = firstActive.ewayBillNo;
            record.ewayBillUrl = firstActive.ewayBillUrl;
            record.ewayBillDate = firstActive.ewayBillDate;
          }
        }

        record.markModified("containers");
        await record.save();
        updatedAny = true;
      }
    }

    const finalList = updatedAny ? await OtherEwayBill.find(query).sort({ createdAt: -1 }) : list;
    res.status(200).json({ success: true, data: finalList });
  } catch (error) {
    console.error("Error listing others eway bills:", error.message);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch list" });
  }
});

router.post("/others/update-status", authenticateUser, async (req, res) => {
  try {
    const { otherEwayBillId, ewayBillNo, ewayBillDate, validUpto, ewayBillUrl, ewayBillData } = req.body;
    if (!otherEwayBillId) {
      return res.status(400).json({ success: false, message: "otherEwayBillId is required" });
    }

    const query = req.user.role === "superadmin" ? { _id: otherEwayBillId } : { _id: otherEwayBillId, clientId: req.user.adminId?._id || req.user.adminId || req.user._id };
    const record = await OtherEwayBill.findOne(query);
    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found or unauthorized" });
    }

    // Legacy fallback: if containers array is empty, initialize it on the fly
    if (!record.containers || record.containers.length === 0) {
      const boeDetailForConts = record.parsedData?.data || record.parsedData || {};
      const containerDetails = boeDetailForConts.ContainerDetails || [];
      record.containers = containerDetails.map(bc => {
        const cNo = bc["CONTAINER NUMBER"] || bc.ContainerNo || bc.container_number || bc.CONTR_NO || bc.CONTR || bc.containerNo || "";
        return {
          containerNumber: cNo.trim(),
          ewayBillStatus: "Pending"
        };
      }).filter(c => c.containerNumber);
    }

    if (Array.isArray(ewayBillData)) {
      // Individual Mode (multiple results in array)
      record.containers = record.containers.map(cont => {
        const result = ewayBillData.find(r => {
          const rCont = r.container || r.container_number;
          return r.status === "success" && rCont && String(rCont).trim().toUpperCase() === String(cont.containerNumber).trim().toUpperCase();
        });
        if (result) {
          return {
            ...cont.toObject(),
            ewayBillNo: String(result.ewbNo),
            ewayBillDate: result.ewbDate ? new Date(result.ewbDate) : new Date(),
            ewayBillUrl: result.url || result.pdfUrl,
            ewayBillStatus: "Generated",
            ewayBillData: result
          };
        }
        return cont;
      });
    } else {
      // Combined Mode (single result, applies to selected containers)
      // If ewayBillData contains containerIds (e.g. from PartAEwayBillModal / EwayBillGenerate), we update those
      const targetContainerNos = ewayBillData?.containerIds || [];
      record.containers = record.containers.map(cont => {
        const isSelected = targetContainerNos.length === 0 || targetContainerNos.some(cNo => String(cNo).trim().toUpperCase() === String(cont.containerNumber).trim().toUpperCase());
        if (isSelected && cont.ewayBillStatus === "Pending") {
          return {
            ...cont.toObject(),
            ewayBillNo,
            ewayBillDate: ewayBillDate ? new Date(ewayBillDate) : new Date(),
            ewayBillUrl,
            ewayBillStatus: "Generated",
            ewayBillData
          };
        }
        return cont;
      });
    }

    // Set parent status
    const pending = record.containers.filter(c => c.ewayBillStatus === "Pending");
    const generated = record.containers.filter(c => c.ewayBillStatus === "Generated");
    if (pending.length === 0) {
      record.ewayBillStatus = "Generated";
    } else if (generated.length > 0) {
      record.ewayBillStatus = "Partially Generated";
    } else {
      record.ewayBillStatus = "Pending";
    }

    // Backup parent single ewayBill details for backward compatibility in listings/cancellations
    const firstActive = record.containers.find(c => c.ewayBillStatus === "Generated");
    if (firstActive) {
      record.ewayBillNo = firstActive.ewayBillNo;
      record.ewayBillDate = firstActive.ewayBillDate;
      record.ewayBillUrl = firstActive.ewayBillUrl;
      record.ewayBillData = firstActive.ewayBillData;
    }

    record.markModified("containers");
    record.markModified("ewayBillData");
    await record.save();
    res.status(200).json({ success: true, data: record });
  } catch (error) {
    console.error("Error updating others eway bill status:", error.message);
    res.status(500).json({ success: false, message: error.message || "Failed to update status" });
  }
});

router.post("/others/update-cancellation", authenticateUser, async (req, res) => {
  try {
    const { otherEwayBillId, ewayBillNo } = req.body;
    if (!otherEwayBillId) {
      return res.status(400).json({ success: false, message: "otherEwayBillId is required" });
    }

    const query = req.user.role === "superadmin" ? { _id: otherEwayBillId } : { _id: otherEwayBillId, clientId: req.user.adminId?._id || req.user.adminId || req.user._id };
    const record = await OtherEwayBill.findOne(query);
    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found or unauthorized" });
    }

    if (ewayBillNo) {
      // Mark specific container's E-Way Bill as Cancelled
      record.containers = record.containers.map(cont => {
        if (cont.ewayBillNo === String(ewayBillNo)) {
          return {
            ...cont.toObject(),
            ewayBillStatus: "Cancelled"
          };
        }
        return cont;
      });

      // Recalculate parent status
      const active = record.containers.filter(c => c.ewayBillStatus === "Generated");
      const pending = record.containers.filter(c => c.ewayBillStatus === "Pending");
      if (active.length === 0 && pending.length === 0) {
        record.ewayBillStatus = "Cancelled";
      } else if (active.length > 0) {
        record.ewayBillStatus = pending.length > 0 ? "Partially Generated" : "Generated";
      } else {
        record.ewayBillStatus = "Pending";
      }

      // If the parent ewayBillNo matches the cancelled one, update it to another active one (or clear it)
      if (record.ewayBillNo === String(ewayBillNo)) {
        const firstActive = record.containers.find(c => c.ewayBillStatus === "Generated");
        if (firstActive) {
          record.ewayBillNo = firstActive.ewayBillNo;
          record.ewayBillUrl = firstActive.ewayBillUrl;
          record.ewayBillDate = firstActive.ewayBillDate;
          record.ewayBillData = firstActive.ewayBillData;
        } else {
          record.ewayBillNo = undefined;
          record.ewayBillUrl = undefined;
          record.ewayBillDate = undefined;
          record.ewayBillData = undefined;
        }
      }

      record.markModified("containers");
      await record.save();
      return res.status(200).json({ success: true, data: record });
    }

    // Default: update entire record and all containers to Cancelled
    record.containers = record.containers.map(cont => ({
      ...cont.toObject(),
      ewayBillStatus: "Cancelled"
    }));
    record.ewayBillStatus = "Cancelled";
    record.ewayBillNo = undefined;
    record.ewayBillUrl = undefined;
    record.ewayBillDate = undefined;
    record.ewayBillData = undefined;

    record.markModified("containers");
    await record.save();
    res.status(200).json({ success: true, data: record });
  } catch (error) {
    console.error("Error cancelling others eway bill:", error.message);
    res.status(500).json({ success: false, message: error.message || "Failed to cancel record" });
  }
});

router.delete("/others/:id", authenticateUser, async (req, res) => {
  try {
    const query = req.user.role === "superadmin" ? { _id: req.params.id } : { _id: req.params.id, clientId: req.user.adminId?._id || req.user.adminId || req.user._id };
    const deleted = await OtherEwayBill.findOneAndDelete(query);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Record not found or unauthorized to delete" });
    }
    res.status(200).json({ success: true, message: "Record deleted successfully" });
  } catch (error) {
    console.error("Error deleting others eway bill:", error.message);
    res.status(500).json({ success: false, message: error.message || "Failed to delete record" });
  }
});

// ============================================================================
// PHASE 2: E-WAY BILL GENERATION INTERCEPTION (CREDIT-BASED SAAS MODEL)
// ============================================================================

/**
 * POST /api/eway-bill/generate
 * Intercepts E-Way Bill generation to enforce credit checking, blocking, 
 * atomic execution, and finalization/rollback.
 * 
 * Pattern: Block Credits -> Execute Downstream API -> Finalize / Rollback
 */
router.post("/generate", authenticateUser, async (req, res) => {
  const clientId = (
    req.user.adminId?._id ||
    req.user.adminId ||
    req.user._id
  )?.toString();

  const refId = (
    req.body?.formData?.documentNumber ||
    req.body?.formData?.docNo ||
    req.body?.containerId ||
    req.body?.lrId ||
    req.body?.formData?.boeNumber ||
    `REF_${Date.now()}`
  )
    .toString()
    .trim();

  console.log(`💳 [EWB SaaS Billing] Generation initiated for Client: ${clientId}, RefId: ${refId}`);

  let blockedAmount = 0;
  let pricing = { debit: 1, reward: 0, reason: "Standard Tier" };

  try {
    // ── 1. IDEMPOTENCY CHECK ──────────────────────────────────────────────────
    // Check if this document or container already has an active E-Way Bill generated.
    // If already generated and recorded, return cached success without debiting again.
    const boeNo = req.body?.formData?.documentNumber || req.body?.formData?.docNo;
    const containerId = req.body?.containerId;

    if (boeNo) {
      const existingDoc = await OtherEwayBill.findOne({ boeNumber: boeNo }).lean();
      if (existingDoc) {
        if (containerId) {
          const matchingCont = (existingDoc.containers || []).find(
            (c) =>
              c.containerNumber?.toUpperCase() === containerId?.toUpperCase() &&
              c.ewayBillStatus === "Generated" &&
              c.ewayBillNo
          );
          if (matchingCont) {
            console.log(`⚡ [Idempotency] E-Way bill already exists for container ${containerId}. Returning cached response.`);
            return res.status(200).json({
              success: true,
              message: `E-Way Bill ${matchingCont.ewayBillNo} already generated for container ${containerId}. No credits deducted.`,
              data: {
                ewbNo: matchingCont.ewayBillNo,
                ewbDate: matchingCont.ewayBillDate,
                url: matchingCont.ewayBillUrl,
                status: "success",
                alreadyGenerated: true,
                idempotentReplay: true,
              },
            });
          }
        } else if (existingDoc.ewayBillStatus === "Generated" && existingDoc.ewayBillNo) {
          console.log(`⚡ [Idempotency] E-Way bill already exists for BOE ${boeNo}. Returning cached response.`);
          return res.status(200).json({
            success: true,
            message: `E-Way Bill ${existingDoc.ewayBillNo} already generated for Bill of Entry ${boeNo}. No credits deducted.`,
            data: {
              ewbNo: existingDoc.ewayBillNo,
              ewbDate: existingDoc.ewayBillDate,
              url: existingDoc.ewayBillUrl,
              status: "success",
              alreadyGenerated: true,
              idempotentReplay: true,
            },
          });
        }
      }
    }

    // ── 2. DYNAMIC PRICING EVALUATION ─────────────────────────────────────────
    pricing = await getPricingRule(req.user, req.body);
    console.log(`🏷️ [EWB SaaS Billing] Pricing tier resolved:`, pricing);

    // ── 2.5 ACCOUNT VALIDITY & EXPIRY CHECK ────────────────────────────────────
    const clientWallet = await getOrCreateWallet(clientId);
    if (clientWallet.validUntil && new Date() > new Date(clientWallet.validUntil)) {
      const expDateStr = new Date(clientWallet.validUntil).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      return res.status(403).json({
        success: false,
        code: "WALLET_EXPIRED",
        message: `Your E-Way Bill service validity expired on ${expDateStr}. Please top up your account or contact support to renew your subscription.`,
        validUntil: clientWallet.validUntil,
      });
    }

    // ── 3. BLOCK CREDITS (SELECT FOR UPDATE PATTERN) ───────────────────────────
    if (pricing.debit > 0) {
      await checkAndBlockCredits(clientId, pricing.debit, refId);
      blockedAmount = pricing.debit;
      console.log(`🔒 [EWB SaaS Billing] Blocked ${blockedAmount} credit(s) for client ${clientId}`);
    }

    // ── 4. EXECUTE DOWNSTREAM PROXY REQUEST ────────────────────────────────────
    const targetBase = getTargetUrl();
    const targetUrl = `${targetBase}/generate`;
    const serviceToken = await transportAuthService.getServiceToken();

    const headers = { ...req.headers };
    delete headers.host;
    delete headers.connection;
    if (serviceToken) {
      headers.Authorization = `Bearer ${serviceToken}`;
    }

    console.log(`📡 [EWB SaaS Billing] Proxying generate request to Transport API: ${targetUrl}`);
    const downstreamRes = await axios.post(targetUrl, req.body, {
      headers,
      params: req.query,
      timeout: 60000,
      validateStatus: () => true, // capture all status codes cleanly
    });

    const isSuccess =
      downstreamRes.status >= 200 &&
      downstreamRes.status < 300 &&
      downstreamRes.data?.success !== false;

    // ── 5. FINALIZE DEBIT (ON SUCCESS) ────────────────────────────────────────
    if (isSuccess) {
      const ewbNo = downstreamRes.data?.data?.ewbNo || refId;
      console.log(`✅ [EWB SaaS Billing] Downstream E-Way Bill success (${ewbNo}). Finalizing transaction...`);

      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        if (pricing.debit > 0) {
          await finalizeDebit(
            clientId,
            pricing.debit,
            refId,
            `E-Way Bill Generated (${ewbNo})`,
            session
          );
          blockedAmount = 0; // successfully finalized
        }

        if (pricing.reward > 0) {
          await addRewardCredits(
            clientId,
            pricing.reward,
            refId,
            `Incentive Reward: ${pricing.reason} (${ewbNo})`,
            session
          );
          console.log(`🎁 [EWB SaaS Billing] Awarded ${pricing.reward} reward credit(s) to client ${clientId}`);
        }

        await session.commitTransaction();
      } catch (commitErr) {
        await session.abortTransaction();
        console.error("❌ Critical error committing financial transaction:", commitErr);
      } finally {
        session.endSession();
      }

      return res.status(downstreamRes.status).json(downstreamRes.data);
    }

    // ── 6. ROLLBACK BLOCKED CREDITS (ON DOWNSTREAM FAILURE) ────────────────────
    console.warn(`⚠️ [EWB SaaS Billing] Downstream API returned non-success (${downstreamRes.status}). Rolling back blocked credits...`);
    if (blockedAmount > 0) {
      await rollbackBlockedCredits(
        clientId,
        blockedAmount,
        refId,
        `Rollback: Downstream EWB generation returned status ${downstreamRes.status}`
      );
      blockedAmount = 0;
    }

    return res.status(downstreamRes.status).json(downstreamRes.data);
  } catch (error) {
    console.error("❌ [EWB SaaS Billing] Error in /generate interception:", error);

    // Roll back any blocked credits on unexpected exception
    if (blockedAmount > 0) {
      try {
        await rollbackBlockedCredits(
          clientId,
          blockedAmount,
          refId,
          `Rollback on server exception: ${error.message}`
        );
        console.log(`↩️ [EWB SaaS Billing] Successfully rolled back ${blockedAmount} blocked credit(s).`);
      } catch (rollbackErr) {
        console.error("❌ Critical failure during emergency rollback:", rollbackErr);
      }
    }

    // Handle Wallet Expired specifically
    if (error instanceof WalletExpiredError || error.code === "WALLET_EXPIRED") {
      return res.status(403).json({
        success: false,
        code: "WALLET_EXPIRED",
        message: error.message,
        validUntil: error.validUntil,
      });
    }

    // Handle Insufficient Credits specifically
    if (error instanceof InsufficientCreditsError || error.code === "INSUFFICIENT_CREDITS") {
      return res.status(402).json({
        success: false,
        code: "INSUFFICIENT_CREDITS",
        message: error.message,
        availableCredits: error.available,
        requiredCredits: error.required,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process E-Way Bill generation",
    });
  }
});

// ============================================================================
// WALLET & PAYMENT API ENDPOINTS
// ============================================================================

/**
 * GET /api/eway-bill/wallet/balance
 * Returns the current credit balance (available, blocked, effective).
 */
router.get("/wallet/balance", authenticateUser, async (req, res) => {
  try {
    const clientId = (
      req.user.adminId?._id ||
      req.user.adminId ||
      req.user._id
    )?.toString();

    const wallet = await getOrCreateWallet(clientId);
    const pricing = await getPricingRule(req.user, {});

    res.status(200).json({
      success: true,
      data: {
        availableCredits: wallet.availableCredits,
        blockedCredits: wallet.blockedCredits,
        effectiveBalance: wallet.getEffectiveBalance(),
        activationDate: wallet.activationDate,
        validUntil: wallet.validUntil,
        isExpired: wallet.validUntil ? new Date() > new Date(wallet.validUntil) : false,
        daysRemaining: wallet.validUntil ? Math.ceil((new Date(wallet.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
        currencyRate: "1 Credit = ₹9",
        pricingTier: pricing.tier,
        pricingReason: pricing.reason,
      },
    });
  } catch (err) {
    console.error("Error fetching wallet balance:", err);
    res.status(500).json({ success: false, message: "Failed to fetch wallet balance" });
  }
});

/**
 * GET /api/eway-bill/wallet/ledger
 * Returns the immutable credit ledger statement for the client.
 */
router.get("/wallet/ledger", authenticateUser, async (req, res) => {
  try {
    const clientId = (
      req.user.adminId?._id ||
      req.user.adminId ||
      req.user._id
    )?.toString();

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const filter = { clientId };
    if (req.query.type && req.query.type !== "ALL") {
      filter.transactionType = req.query.type;
    }
    if (req.query.search && req.query.search.trim()) {
      const searchRegex = new RegExp(req.query.search.trim(), "i");
      filter.$or = [
        { remarks: searchRegex },
        { referenceModel: searchRegex },
      ];
    }

    const [transactions, total] = await Promise.all([
      CreditLedger.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CreditLedger.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error("Error fetching credit ledger:", err);
    res.status(500).json({ success: false, message: "Failed to fetch credit ledger" });
  }
});

/**
 * GET /api/eway-bill/wallet/payment-requests
 * Returns all payment slip top-up requests submitted by this client.
 */
router.get("/wallet/payment-requests", authenticateUser, async (req, res) => {
  try {
    const clientId = (
      req.user.adminId?._id ||
      req.user.adminId ||
      req.user._id
    )?.toString();

    const filter = { clientId };
    if (req.query.status && req.query.status !== "ALL") {
      filter.status = req.query.status;
    }

    const requests = await PaymentRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (err) {
    console.error("Error fetching payment requests:", err);
    res.status(500).json({ success: false, message: "Failed to fetch payment requests" });
  }
});

/**
 * GET /api/eway-bill/wallet/stats
 * Summary stats: total deposited, total debited, rewards, pending approval count.
 */
router.get("/wallet/stats", authenticateUser, async (req, res) => {
  try {
    const clientId = (
      req.user.adminId?._id ||
      req.user.adminId ||
      req.user._id
    )?.toString();

    const [wallet, ledgerSummary, pendingCount] = await Promise.all([
      getOrCreateWallet(clientId),
      CreditLedger.aggregate([
        { $match: { clientId: new mongoose.Types.ObjectId(clientId) } },
        {
          $group: {
            _id: "$transactionType",
            totalCredits: { $sum: "$credits" },
            count: { $sum: 1 },
          },
        },
      ]),
      PaymentRequest.countDocuments({ clientId, status: "PENDING" }),
    ]);

    const stats = {
      availableCredits: wallet.availableCredits,
      blockedCredits: wallet.blockedCredits,
      effectiveBalance: wallet.getEffectiveBalance(),
      totalDeposited: 0,
      totalDebited: 0,
      totalRewarded: 0,
      pendingRequestsCount: pendingCount,
    };

    ledgerSummary.forEach((item) => {
      if (item._id === "PAYMENT_CREDIT" || item._id === "ADMIN_ADJUSTMENT") {
        if (item.totalCredits > 0) stats.totalDeposited += item.totalCredits;
      } else if (item._id === "EWAYBILL_DEBIT") {
        stats.totalDebited += Math.abs(item.totalCredits);
      } else if (item._id === "EWAYBILL_REWARD") {
        stats.totalRewarded += item.totalCredits;
      }
    });

    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    console.error("Error fetching wallet stats:", err);
    res.status(500).json({ success: false, message: "Failed to fetch wallet stats" });
  }
});

/**
 * POST /api/eway-bill/wallet/payment-request & /api/eway-bill/wallet/topup
 * Submit a manual bank transfer payment slip for admin approval.
 */
const handleTopupPaymentRequest = async (req, res) => {
    try {
      const clientId = (
        req.user.adminId?._id ||
        req.user.adminId ||
        req.user._id
      )?.toString();

      const { amountInr, utrNumber } = req.body;

      if (!amountInr || Number(amountInr) <= 0) {
        return res.status(400).json({ success: false, message: "A valid amount in INR is required" });
      }
      if (!utrNumber || !utrNumber.trim()) {
        return res.status(400).json({ success: false, message: "UTR / Reference Number is required" });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, message: "Payment slip file (Image/PDF) is required" });
      }

      // Check duplicate UTR
      const normalizedUtr = utrNumber.trim().toUpperCase();
      const existingUtr = await PaymentRequest.findOne({ utrNumber: normalizedUtr });
      if (existingUtr) {
        return res.status(400).json({
          success: false,
          message: `Payment request with UTR ${normalizedUtr} has already been submitted.`,
        });
      }

      // Upload slip to S3
      const file = req.file;
      const timestamp = Date.now();
      const extension = file.originalname.substring(file.originalname.lastIndexOf("."));
      const uniqueKey = `payment-slips/${clientId}/${timestamp}-${normalizedUtr}${extension}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.REACT_APP_S3_BUCKET,
          Key: uniqueKey,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );

      const slipUrl = `https://${process.env.REACT_APP_S3_BUCKET}.s3.${process.env.REACT_APP_AWS_REGION}.amazonaws.com/${uniqueKey}`;

      // 1 Credit = ₹9
      const parsedAmount = Number(amountInr);
      const creditsRequested = Math.floor(parsedAmount / 9);

      if (creditsRequested < 1) {
        return res.status(400).json({
          success: false,
          message: "Amount must be at least ₹9 (1 Credit = ₹9)",
        });
      }

      const paymentRequest = new PaymentRequest({
        clientId,
        amountInr: parsedAmount,
        creditsRequested,
        utrNumber: normalizedUtr,
        slipFileUrl: slipUrl,
        slipFileKey: uniqueKey,
        status: "PENDING",
      });

      await paymentRequest.save();

      res.status(201).json({
        success: true,
        message: `Payment request submitted successfully for ${creditsRequested} credit(s). Pending admin verification.`,
        data: paymentRequest,
      });
    } catch (err) {
      console.error("Error creating payment request:", err);
      res.status(500).json({ success: false, message: err.message || "Failed to submit payment request" });
    }
};

router.post("/wallet/payment-request", authenticateUser, handleTopupPaymentRequest);
router.post("/wallet/topup", authenticateUser, handleTopupPaymentRequest);

/**
 * Middleware: Verify request is from punit@alluvium.in or an admin/superadmin.
 */
const checkAdminOrPunit = (req, res, next) => {
  const email = (req.user?.email || "").toLowerCase();
  const role = (req.user?.role || "").toLowerCase();
  const isPunit = email === "punit@alluvium.in";
  const isSuperAdminEmail = email === "superadmin@exim.com";
  const isAdmin = role === "admin" || role === "superadmin" || role === "super_admin" || Boolean(req.user?.isAdmin);
  if (isPunit || isSuperAdminEmail || isAdmin) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Access denied. Only superadmin@exim.com, punit@alluvium.in or system administrators can access this control page.",
  });
};

/**
 * GET /api/eway-bill/admin/wallet/clients
 * Returns all clients with their credit balances, blocked credits, and usage stats.
 */
router.get("/admin/wallet/clients", authenticateUser, checkAdminOrPunit, async (req, res) => {
  try {
    const search = req.query.search ? req.query.search.trim() : "";
    const userQuery = {};
    if (search) {
      userQuery.$or = [
        { name: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
        { ie_code_no: new RegExp(search, "i") },
      ];
    }

    const users = await EximclientUser.find(userQuery)
      .select("_id name email role status ie_code_no createdAt")
      .sort({ name: 1 })
      .lean();

    const userIds = users.map((u) => u._id);

    // Fetch all wallets for these users
    const wallets = await ClientWallet.find({ clientId: { $in: userIds } }).lean();
    const walletMap = new Map();
    wallets.forEach((w) => walletMap.set(w.clientId.toString(), w));

    // Fetch aggregation of ledger stats for each user
    const ledgerAgg = await CreditLedger.aggregate([
      { $match: { clientId: { $in: userIds } } },
      {
        $group: {
          _id: { clientId: "$clientId", type: "$transactionType" },
          totalCredits: { $sum: "$credits" },
          count: { $sum: 1 },
        },
      },
    ]);

    const statsMap = new Map();
    ledgerAgg.forEach((item) => {
      const cId = item._id.clientId.toString();
      if (!statsMap.has(cId)) {
        statsMap.set(cId, { totalDebited: 0, totalDeposited: 0, totalRewarded: 0 });
      }
      const clientStats = statsMap.get(cId);
      if (item._id.type === "EWAYBILL_DEBIT") {
        clientStats.totalDebited += Math.abs(item.totalCredits);
      } else if (item._id.type === "PAYMENT_CREDIT" || item._id.type === "ADMIN_ADJUSTMENT") {
        if (item.totalCredits > 0) clientStats.totalDeposited += item.totalCredits;
      } else if (item._id.type === "EWAYBILL_REWARD") {
        clientStats.totalRewarded += item.totalCredits;
      }
    });

    let totalCirculatingCredits = 0;
    let totalLifetimeDebited = 0;
    let totalLifetimeDeposited = 0;

    const clientsWithWallets = users.map((u) => {
      const w = walletMap.get(u._id.toString()) || { availableCredits: 0, blockedCredits: 0 };
      const s = statsMap.get(u._id.toString()) || { totalDebited: 0, totalDeposited: 0, totalRewarded: 0 };

      totalCirculatingCredits += w.availableCredits || 0;
      totalLifetimeDebited += s.totalDebited;
      totalLifetimeDeposited += s.totalDeposited;

      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        ie_code_no: u.ie_code_no,
        availableCredits: w.availableCredits || 0,
        blockedCredits: w.blockedCredits || 0,
        effectiveBalance: Math.max(0, (w.availableCredits || 0) - (w.blockedCredits || 0)),
        totalDebited: s.totalDebited,
        totalDeposited: s.totalDeposited,
        totalRewarded: s.totalRewarded,
        createdAt: u.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        clients: clientsWithWallets,
        summary: {
          totalClients: users.length,
          totalCirculatingCredits,
          totalLifetimeDebited,
          totalLifetimeDeposited,
        },
      },
    });
  } catch (err) {
    console.error("Error fetching admin client wallets:", err);
    res.status(500).json({ success: false, message: "Failed to fetch client wallets list" });
  }
});

/**
 * POST /api/eway-bill/admin/wallet/adjust-credits
 * Credit or debit a specific client's wallet with remarks.
 */
router.post("/admin/wallet/adjust-credits", authenticateUser, checkAdminOrPunit, async (req, res) => {
  try {
    const { clientId, creditsDelta, remarks, extendDays, newValidUntil } = req.body;
    if (!clientId) {
      return res.status(400).json({ success: false, message: "clientId is required" });
    }
    const delta = Number(creditsDelta);
    if (!delta || isNaN(delta)) {
      return res.status(400).json({ success: false, message: "A valid non-zero credits adjustment amount is required" });
    }

    const adminEmail = req.user.email || "Admin";
    const customRemarks = remarks?.trim()
      ? `${remarks.trim()} (Authorized by ${adminEmail})`
      : `Admin balance adjustment of ${delta > 0 ? "+" : ""}${delta} credits by ${adminEmail}`;

    const result = await adminAdjustCredits(clientId, delta, customRemarks, req.user._id, extendDays, newValidUntil);

    res.status(200).json({
      success: true,
      message: `Successfully ${delta > 0 ? "added" : "deducted"} ${Math.abs(delta)} credit(s). New balance: ${result.wallet.availableCredits}`,
      data: {
        wallet: {
          availableCredits: result.wallet.availableCredits,
          blockedCredits: result.wallet.blockedCredits,
          effectiveBalance: Math.max(0, result.wallet.availableCredits - result.wallet.blockedCredits),
          activationDate: result.wallet.activationDate,
          validUntil: result.wallet.validUntil,
          isExpired: result.wallet.validUntil ? new Date() > new Date(result.wallet.validUntil) : false,
          daysRemaining: result.wallet.validUntil ? Math.ceil((new Date(result.wallet.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
        },
        ledger: result.ledger,
      },
    });
  } catch (err) {
    console.error("Error adjusting client credits:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to adjust credits" });
  }
});

/**
 * GET /api/eway-bill/admin/wallet/client-ledger/:clientId
 * Returns full transaction audit ledger for any specific client.
 */
router.get("/admin/wallet/client-ledger/:clientId", authenticateUser, checkAdminOrPunit, async (req, res) => {
  try {
    const { clientId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const filter = { clientId };
    if (req.query.type && req.query.type !== "ALL") {
      filter.transactionType = req.query.type;
    }

    const [transactions, total, client, wallet] = await Promise.all([
      CreditLedger.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      CreditLedger.countDocuments(filter),
      EximclientUser.findById(clientId).select("name email ie_code_no role").lean(),
      ClientWallet.findOne({ clientId }).lean(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        client,
        wallet: wallet || { availableCredits: 0, blockedCredits: 0 },
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error("Error fetching client ledger for admin:", err);
    res.status(500).json({ success: false, message: "Failed to fetch client ledger" });
  }
});

/**
 * GET /api/eway-bill/admin/wallet/client-details/:clientId
 * Returns client details, wallet balance, summary stats, partner status, and recent ledger entries.
 */
router.get("/admin/wallet/client-details/:clientId", authenticateUser, checkAdminOrPunit, async (req, res) => {
  try {
    const { clientId } = req.params;
    const [client, wallet, transactions, statsAgg] = await Promise.all([
      EximclientUser.findById(clientId).select("name email role status isSfplClient ie_code_no").lean(),
      getOrCreateWallet(clientId),
      CreditLedger.find({ clientId }).sort({ createdAt: -1 }).limit(20).lean(),
      CreditLedger.aggregate([
        { $match: { clientId: new mongoose.Types.ObjectId(clientId) } },
        {
          $group: {
            _id: "$transactionType",
            totalCredits: { $sum: "$credits" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    if (!client) {
      return res.status(404).json({ success: false, message: "Client user not found" });
    }

    const stats = {
      totalDebited: 0,
      totalDeposited: 0,
      totalRewarded: 0,
    };

    statsAgg.forEach((item) => {
      if (item._id === "EWAYBILL_DEBIT") {
        stats.totalDebited += Math.abs(item.totalCredits);
      } else if (item._id === "PAYMENT_CREDIT" || item._id === "ADMIN_ADJUSTMENT") {
        if (item.totalCredits > 0) stats.totalDeposited += item.totalCredits;
      } else if (item._id === "EWAYBILL_REWARD") {
        stats.totalRewarded += item.totalCredits;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        client,
        wallet: {
          availableCredits: wallet.availableCredits,
          blockedCredits: wallet.blockedCredits,
          effectiveBalance: Math.max(0, wallet.availableCredits - wallet.blockedCredits),
          activationDate: wallet.activationDate,
          validUntil: wallet.validUntil,
          isExpired: wallet.validUntil ? new Date() > new Date(wallet.validUntil) : false,
          daysRemaining: wallet.validUntil ? Math.ceil((new Date(wallet.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
        },
        stats,
        isSfplClient: Boolean(client.isSfplClient),
        recentTransactions: transactions,
      },
    });
  } catch (err) {
    console.error("Error fetching client details for admin:", err);
    res.status(500).json({ success: false, message: "Failed to fetch client details" });
  }
});

/**
 * POST /api/eway-bill/admin/wallet/set-partner-tier
 * Sets SFPL+SRCC partner tier for a client.
 */
router.post("/admin/wallet/set-partner-tier", authenticateUser, checkAdminOrPunit, async (req, res) => {
  try {
    const { clientId, isSfplClient } = req.body;
    if (!clientId) {
      return res.status(400).json({ success: false, message: "clientId is required" });
    }

    const client = await EximclientUser.findByIdAndUpdate(
      clientId,
      { $set: { isSfplClient: Boolean(isSfplClient) } },
      { new: true }
    ).select("name email isSfplClient");

    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    res.status(200).json({
      success: true,
      message: `Partner tier updated for ${client.name}. SFPL+SRCC Partner: ${client.isSfplClient ? "ENABLED" : "DISABLED"}`,
      data: client,
    });
  } catch (err) {
    console.error("Error updating partner tier:", err);
    res.status(500).json({ success: false, message: "Failed to update partner tier" });
  }
});

/**
 * POST /api/eway-bill/admin/wallet/set-validity
 * SuperAdmin endpoint: update or extend the service validity date.
 */
router.post("/admin/wallet/set-validity", authenticateUser, checkAdminOrPunit, async (req, res) => {
  try {
    const { clientId, validUntil, extendDays, remarks } = req.body;
    if (!clientId) {
      return res.status(400).json({ success: false, message: "clientId is required" });
    }

    let targetDate = validUntil ? new Date(validUntil) : null;
    if (!targetDate && extendDays) {
      const current = await getOrCreateWallet(clientId);
      const days = Number(extendDays);
      if (!current.validUntil || new Date() > new Date(current.validUntil)) {
        targetDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      } else {
        targetDate = new Date(new Date(current.validUntil).getTime() + days * 24 * 60 * 60 * 1000);
      }
    }

    if (!targetDate || isNaN(targetDate.getTime())) {
      return res.status(400).json({ success: false, message: "A valid validity date or extendDays is required" });
    }

    const wallet = await setWalletValidity(clientId, targetDate, req.user._id);

    // Record ledger audit entry
    await CreditLedger.create([
      {
        clientId,
        transactionType: "ADMIN_ADJUSTMENT",
        credits: 0,
        balanceAfter: wallet.availableCredits,
        referenceModel: "AdminValidityAdjustment",
        referenceId: req.user._id,
        remarks:
          remarks ||
          `Admin updated service validity expiration to ${targetDate.toLocaleDateString("en-IN")}`,
      },
    ]);

    res.status(200).json({
      success: true,
      message: `Account service validity successfully updated to ${targetDate.toLocaleDateString("en-IN")}`,
      data: {
        wallet: {
          availableCredits: wallet.availableCredits,
          blockedCredits: wallet.blockedCredits,
          effectiveBalance: Math.max(0, wallet.availableCredits - wallet.blockedCredits),
          activationDate: wallet.activationDate,
          validUntil: wallet.validUntil,
          isExpired: wallet.validUntil ? new Date() > new Date(wallet.validUntil) : false,
          daysRemaining: wallet.validUntil ? Math.ceil((new Date(wallet.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
        },
      },
    });
  } catch (err) {
    console.error("Error setting wallet validity:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to set validity" });
  }
});

/**
 * POST /api/eway-bill/wallet/approve-payment & /api/admin/wallet/approve-payment
 * Admin endpoint: Approve payment request and credit client's wallet.
 */
const handleApprovePayment = async (req, res) => {
  try {
    const email = (req.user?.email || "").toLowerCase();
    const role = (req.user?.role || "").toLowerCase();
    const isPunit = email === "punit@alluvium.in";
    const isSuperAdminEmail = email === "superadmin@exim.com";
    const isAdmin = role === "admin" || role === "superadmin" || role === "super_admin";

    if (!isPunit && !isSuperAdminEmail && !isAdmin) {
      return res.status(403).json({ success: false, message: "Unauthorized. Admin privileges required." });
    }

    const { paymentId } = req.body;
    if (!paymentId) {
      return res.status(400).json({ success: false, message: "paymentId is required" });
    }

    const result = await approvePayment(paymentId, req.user._id);

    res.status(200).json({
      success: true,
      message: `Payment request approved. Added ${result.payment.creditsRequested} credit(s) to client wallet.`,
      data: {
        payment: result.payment,
        walletBalance: result.wallet.availableCredits,
      },
    });
  } catch (err) {
    console.error("Error approving payment:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to approve payment" });
  }
};

router.post("/wallet/approve-payment", authenticateUser, handleApprovePayment);
router.post("/admin/wallet/approve-payment", authenticateUser, handleApprovePayment);

// Define routes
router.use(authenticateUser, multipartHandler, proxyRequest);

export default router;
