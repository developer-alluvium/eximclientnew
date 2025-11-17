import express from "express";
import {
  getImportClearanceAll,
  getImportClearanceByImporter,
  getImportClearanceByIECode,
  getDateValidityAnalytics,
  getEventTimelineData,
  getStatusDistribution, // Add this import
} from "../controllers/analyticsController.js";

const router = express.Router();

// Import clearance routes
router.get("/api/import-clearance/:year/:month", getImportClearanceAll);
router.get(
  "/api/import-clearance/:year/:month/:importer",
  getImportClearanceByImporter
);
router.get(
  "/api/import-clearance/:year/:month/ie-code/:ieCode",
  getImportClearanceByIECode
);

// Operational analytics routes
router.get("/api/date-validity/:year", getDateValidityAnalytics);
router.get("/api/event-timeline/:year", getEventTimelineData);
router.get("/api/status-distribution/:year", getStatusDistribution); // Add this route

export default router;
