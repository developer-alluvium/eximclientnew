import ClientQuery from "../models/clientQueryModel.js";
import Notification from "../models/notificationModel.js";
import Admin from "../models/adminModel.js";
import SuperAdmin from "../models/superAdminModel.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Initialize S3 if AWS credentials exist
const getS3Client = () => {
  if (process.env.REACT_APP_ACCESS_KEY && process.env.REACT_APP_SECRET_ACCESS_KEY) {
    return new S3Client({
      region: process.env.REACT_APP_AWS_REGION || "ap-south-1",
      credentials: {
        accessKeyId: process.env.REACT_APP_ACCESS_KEY,
        secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY,
      },
    });
  }
  return null;
};

// Helper: Notify admins when a client query or reply is submitted
const notifyAdminsAboutQuery = async ({ job_no, message, client_name, module_type = "import", queryId }) => {
  try {
    const title = `New Query on Job ${job_no}`;
    const notificationMsg = `${client_name || "Client"} raised a query: "${message.substring(0, 100)}${message.length > 100 ? "..." : ""}"`;

    const admins = await Admin.find({ isActive: true }).select("_id");
    const superAdmins = await SuperAdmin.find().select("_id");

    const notifications = [];

    admins.forEach((admin) => {
      notifications.push({
        type: "system_alert",
        recipient: admin._id,
        recipientModel: "Admin",
        title,
        message: notificationMsg,
        data: { job_no, queryId, module_type },
        priority: "high",
        category: "warning",
      });
    });

    superAdmins.forEach((sa) => {
      notifications.push({
        type: "system_alert",
        recipient: sa._id,
        recipientModel: "SuperAdmin",
        title,
        message: notificationMsg,
        data: { job_no, queryId, module_type },
        priority: "high",
        category: "warning",
      });
    });

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (error) {
    console.error("Error sending query notifications:", error);
  }
};

/**
 * POST /api/client-queries
 * Create a new query for a job (Import/Export)
 */
export const createClientQuery = async (req, res) => {
  try {
    const { job_no, job_id, subject, message, client_id, client_name, module_type = "import", attachments = [] } = req.body;

    if (!job_no || !message) {
      return res.status(400).json({ success: false, message: "Job number and message are required." });
    }

    const query = new ClientQuery({
      module_type,
      job_no,
      job_id,
      client_id: client_id || req.user?.ie_code_no || req.user?.email,
      client_name: client_name || req.user?.name || "Client",
      client_email: req.user?.email || "",
      client_username: req.user?.name || req.user?.email || "",
      subject: subject || "Client Query",
      message: message.trim(),
      attachments,
      status: "open",
      seenByClient: true,
      seenByAdmin: false,
    });

    await query.save();

    // Trigger notification to admins
    await notifyAdminsAboutQuery({
      job_no,
      message: query.message,
      client_name: query.client_name,
      module_type,
      queryId: query._id,
    });

    return res.status(201).json({
      success: true,
      message: "Query created successfully",
      query,
    });
  } catch (error) {
    console.error("Create client query error:", error);
    return res.status(500).json({ success: false, message: "Error creating query", error: error.message });
  }
};

/**
 * GET /api/client-queries
 * Get queries for a job or list
 */
export const getClientQueries = async (req, res) => {
  try {
    const { job_no, status, module_type } = req.query;
    const filter = {};

    if (job_no) filter.job_no = job_no;
    if (status) filter.status = status;
    if (module_type) filter.module_type = module_type;

    const queries = await ClientQuery.find(filter).sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      queries,
    });
  } catch (error) {
    console.error("Get client queries error:", error);
    return res.status(500).json({ success: false, message: "Error fetching queries", error: error.message });
  }
};

/**
 * POST /api/client-queries/jobs-status
 * Check status map for array of job numbers
 */
export const getJobsQueryStatus = async (req, res) => {
  try {
    const { jobNos = [], isClient = true } = req.body;

    if (!Array.isArray(jobNos) || jobNos.length === 0) {
      return res.status(200).json({ success: true, data: {} });
    }

    const queries = await ClientQuery.find({ job_no: { $in: jobNos } }).select(
      "job_no status seenByClient seenByAdmin replies"
    );

    const statusMap = {};
    jobNos.forEach((jNo) => {
      statusMap[jNo] = {
        hasQueries: false,
        hasUnseen: false,
        hasOpenQueries: false,
      };
    });

    queries.forEach((q) => {
      const jNo = q.job_no;
      if (!statusMap[jNo]) {
        statusMap[jNo] = { hasQueries: false, hasUnseen: false, hasOpenQueries: false };
      }

      statusMap[jNo].hasQueries = true;

      if (q.status === "open") {
        statusMap[jNo].hasOpenQueries = true;
      }

      // Check unseen messages:
      // If requested by client, unseen if !seenByClient
      // If requested by admin, unseen if !seenByAdmin
      if (isClient) {
        if (!q.seenByClient) {
          statusMap[jNo].hasUnseen = true;
        }
      } else {
        if (!q.seenByAdmin) {
          statusMap[jNo].hasUnseen = true;
        }
      }
    });

    return res.status(200).json({
      success: true,
      data: statusMap,
    });
  } catch (error) {
    console.error("Get jobs query status error:", error);
    return res.status(500).json({ success: false, message: "Error getting status", error: error.message });
  }
};

/**
 * PUT /api/client-queries/:id/reply
 * Reply to a query
 */
export const replyToClientQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, repliedBy, senderType = "client", attachments = [] } = req.body;

    const query = await ClientQuery.findById(id);
    if (!query) {
      return res.status(404).json({ success: false, message: "Query not found" });
    }

    const reply = {
      message: (message || "").trim() || (attachments.length > 0 ? "Attached file(s)" : ""),
      repliedBy: repliedBy || req.user?.name || "User",
      senderType: senderType || (req.user?.role === "admin" || req.user?.role === "superadmin" ? "admin" : "client"),
      email: req.user?.email || "",
      username: req.user?.name || req.user?.email || "",
      attachments,
      repliedAt: new Date(),
    };

    query.replies.push(reply);

    // Update seen flags
    if (reply.senderType === "client") {
      query.seenByAdmin = false;
      query.seenByClient = true;
      // Notify admins
      await notifyAdminsAboutQuery({
        job_no: query.job_no,
        message: reply.message,
        client_name: reply.repliedBy,
        module_type: query.module_type,
        queryId: query._id,
      });
    } else {
      query.seenByAdmin = true;
      query.seenByClient = false;
    }

    await query.save();

    return res.status(200).json({
      success: true,
      message: "Reply sent successfully",
      query,
    });
  } catch (error) {
    console.error("Reply to query error:", error);
    return res.status(500).json({ success: false, message: "Error replying to query", error: error.message });
  }
};

/**
 * PUT /api/client-queries/:id/resolve
 * Resolve a query
 */
export const resolveClientQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolvedBy, resolutionNote } = req.body;

    const query = await ClientQuery.findById(id);
    if (!query) {
      return res.status(404).json({ success: false, message: "Query not found" });
    }

    query.status = "resolved";
    query.resolvedBy = resolvedBy || req.user?.name || "User";
    query.resolvedAt = new Date();
    query.resolutionNote = resolutionNote || "Resolved from dashboard";
    query.seenByClient = true;
    query.seenByAdmin = true;

    await query.save();

    return res.status(200).json({
      success: true,
      message: "Query resolved successfully",
      query,
    });
  } catch (error) {
    console.error("Resolve query error:", error);
    return res.status(500).json({ success: false, message: "Error resolving query", error: error.message });
  }
};

/**
 * PUT /api/client-queries/mark-seen
 * Mark query threads as seen by client or admin
 */
export const markQueriesSeen = async (req, res) => {
  try {
    const { queryIds = [], isClient = true } = req.body;

    if (!Array.isArray(queryIds) || queryIds.length === 0) {
      return res.status(200).json({ success: true, message: "No queries provided" });
    }

    const updateField = isClient ? { seenByClient: true } : { seenByAdmin: true };
    await ClientQuery.updateMany({ _id: { $in: queryIds } }, { $set: updateField });

    return res.status(200).json({
      success: true,
      message: "Queries marked as seen",
    });
  } catch (error) {
    console.error("Mark queries seen error:", error);
    return res.status(500).json({ success: false, message: "Error marking seen", error: error.message });
  }
};

/**
 * POST /api/client-queries/upload-attachment
 * Upload document attachment for chat
 */
export const uploadQueryAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    const file = req.file;
    const folderName = req.body.folderName || "query_attachments";
    const timestamp = Date.now();
    const originalName = file.originalname;
    const extension = originalName.substring(originalName.lastIndexOf("."));
    const baseName = originalName.substring(0, originalName.lastIndexOf("."));

    const uniqueFileName = `${baseName}-${timestamp}${extension}`;
    const key = `${folderName}/${uniqueFileName}`;

    const s3 = getS3Client();
    let location = "";

    if (s3 && process.env.REACT_APP_S3_BUCKET) {
      const params = {
        Bucket: process.env.REACT_APP_S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      const command = new PutObjectCommand(params);
      await s3.send(command);
      location = `https://${process.env.REACT_APP_S3_BUCKET}.s3.${process.env.REACT_APP_AWS_REGION || "ap-south-1"}.amazonaws.com/${key}`;
    } else {
      // Data URI fallback if S3 not configured
      const mime = file.mimetype || "application/octet-stream";
      location = `data:${mime};base64,${file.buffer.toString("base64")}`;
    }

    return res.status(200).json({
      success: true,
      fileName: originalName,
      fileUrl: location,
      fileType: file.mimetype,
    });
  } catch (error) {
    console.error("Upload query attachment error:", error);
    return res.status(500).json({ success: false, message: "Upload failed", error: error.message });
  }
};
