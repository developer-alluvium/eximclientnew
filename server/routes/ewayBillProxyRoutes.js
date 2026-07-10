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
    if (req.path === "/boe-upload" || req.path === "/others/upload-boe") {
      return upload.single("file")(req, res, next);
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
    form.append("files", file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    console.log(`📡 [Others Upload] Sending file to parser: ${BOE_API_BASE}/upload`);
    const parserResponse = await axios.post(`${BOE_API_BASE}/upload`, form, {
      headers: { ...form.getHeaders() },
      timeout: 60000,
    });

    const parsedData = parserResponse.data;

    let records = [];
    if (parsedData.status === "success" && parsedData.data && typeof parsedData.data === "object" && !Array.isArray(parsedData.data)) {
      records = Object.values(parsedData.data);
    } else {
      records = Array.isArray(parsedData) ? parsedData : (parsedData.records || parsedData.data || [parsedData]);
    }

    const boeRecord = records[0] || {};
    const boeDetail = boeRecord.data || boeRecord;
    const importerDetails = boeDetail.ImporterDetails || {};
    const invoiceDetails = boeDetail.InvoiceAndItemDetails || {};

    const boeNumber = importerDetails["BE No"] || importerDetails["BE_NO"] || invoiceDetails.BE_NO || invoiceDetails.document_no || boeRecord.documentNumber || "";
    const rawBoeDate = importerDetails["BE Date"] || importerDetails["BE_DATE"] || invoiceDetails.BE_DATE || invoiceDetails.document_date || "";

    const normalizedBoeNumber = boeNumber.trim();
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
    res.status(500).json({ success: false, message: error.message || "Failed to process BOE upload" });
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

// Define routes
router.use(authenticateUser, multipartHandler, proxyRequest);

export default router;
