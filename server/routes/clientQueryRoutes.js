import express from "express";
import multer from "multer";
import {
  createClientQuery,
  getClientQueries,
  getJobsQueryStatus,
  replyToClientQuery,
  resolveClientQuery,
  markQueriesSeen,
  uploadQueryAttachment,
} from "../controllers/clientQueryController.js";
import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

// Create new query
router.post("/api/client-queries", authenticateUser, createClientQuery);

// Get queries by job_no or status
router.get("/api/client-queries", authenticateUser, getClientQueries);

// Batch query status check for job numbers
router.post("/api/client-queries/jobs-status", authenticateUser, getJobsQueryStatus);

// Mark queries as seen
router.put("/api/client-queries/mark-seen", authenticateUser, markQueriesSeen);

// Reply to query
router.put("/api/client-queries/:id/reply", authenticateUser, replyToClientQuery);

// Resolve query
router.put("/api/client-queries/:id/resolve", authenticateUser, resolveClientQuery);

// Upload document attachment for chat
router.post("/api/client-queries/upload-attachment", authenticateUser, upload.single("file"), uploadQueryAttachment);

export default router;
