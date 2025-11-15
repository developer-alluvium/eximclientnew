import express from "express";
import {
  getImportClearanceAll,
  getImportClearanceByImporter,
  getImportClearanceByIECode,
  getDateValidityAnalytics,

} from "../controllers/analyticsController.js";

const router = express.Router();

// Import clearance routes
router.get("/api/import-clearance/:year/:month", getImportClearanceAll);
router.get(
  "/api/import-clearance/:year/:month/:importer",
  getImportClearanceByImporter
);
router.get("/api/date-validity/:year/:month", getDateValidityAnalytics);
router.get("/api/date-validity/:year", getDateValidityAnalytics);
router.get("/api/import-clearance/:year/:month", getImportClearanceAll);
router.get("/api/import-clearance/:year/:month/ie-code/:ieCode",getImportClearanceByIECode);

export default router;
