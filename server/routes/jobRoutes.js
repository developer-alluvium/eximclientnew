import express from "express";
import {
  getImporterJobCounts,
  getJobByNumber,
  getYears,
  getduty,
  updatePerKgCost,
  lookup,
  storeCalculatorData,
  getJobNumbersByIECode,
  getExporters,
  getHsCodes,
  getSuppliers,
  updateJobDutyAndWeight,
  getContainerSummary,
  getContainerDetails,
  getJobNumbersByMultipleIECodes,
  getBeNumbersByMultipleIECodes,
} from "../controllers/jobController.js";
import {
  getJobsByStatusAndImporter,
  updateContainerTransporter,
  updateJob,
  getJobsByMultipleIECodes,
} from "../controllers/jobStatusController.js";
import {
  getJobsOverview,
  getUserDashboardStats,
} from "../controllers/jobOverviewController.js";
import { authenticateUser } from "../middlewares/authMiddleware.js";
import {
  getJobsByIECode,
  getJobsMultiStatus,
} from "../controllers/optimizedJobController.js";

import {
  getJobsByStatusAndImporterGandhidham,
  getImporterJobCountsGandhidham,
  getExportersGandhidham,
  getBeNumbersByMultipleIECodesGandhidham,
  getJobNumbersByMultipleIECodesGandhidham,
  lookupGandhidam,
  updatePerKgCostGandhidham,
  storeCalculatorDataGandhidham,
  updateJobDutyAndWeightGandhidham,
  getContainerDetailsGandhidham,
  getContainerSummaryGandhidham,
} from "../controllers/gandhidhamController.js";

const router = express.Router();

router.get("/api/get-importer-jobs/:importerURL/:year", authenticateUser, getImporterJobCounts);
router.get("/api/get-job/:year/:jobNo", authenticateUser, getJobByNumber);
router.get("/api/get-job-numbers/multiple", authenticateUser, getJobNumbersByMultipleIECodes);
router.get("/api/get-be-numbers/multiple", authenticateUser, getBeNumbersByMultipleIECodes);
router.get(
  "/api/gandhidham/get-be-numbers/multiple",
  authenticateUser,
  getBeNumbersByMultipleIECodesGandhidham,
);
router.get(
  "/api/gandhidham/get-job-numbers/multiple",
  authenticateUser,
  getJobNumbersByMultipleIECodesGandhidham,
);
router.get("/api/get-job-numbers/:ie_code_no", authenticateUser, getJobNumbersByIECode); // Supports ?year= query param

// Optimized routes for IE code based filtering
router.get("/api/optimized/:year/jobs/:ieCode/:status", authenticateUser, getJobsByIECode);
router.get("/api/optimized/:year/jobs/:ieCode/all", authenticateUser, getJobsMultiStatus);

// Route for multiple IE codes
router.get(
  "/api/:year/jobs/:status/:detailedStatus/:customHouse/multiple",
  authenticateUser,
  getJobsByMultipleIECodes,
);

router.get(
  "/api/:year/jobs/:status/:detailedStatus/:importer",
  authenticateUser,
  getJobsByStatusAndImporter,
);
// Gandhidham jobs route
router.get(
  "/api/gandhidham/:year/jobs/:status/:detailedStatus/:customHouse/multiple",
  authenticateUser,
  getJobsByStatusAndImporterGandhidham,
);

router.get(
  "/api/gandhidham/get-importer-jobs/:importerURL/:year",
  authenticateUser,
  getImporterJobCountsGandhidham,
);

router.patch("/api/jobs/:id", authenticateUser, updateJob);

router.patch("/api/jobs/container/:id", authenticateUser, updateContainerTransporter);

// Route to get jobs overview
router.get("/api/user-dashboard-stats", authenticateUser, getUserDashboardStats);
router.get("/api/get-jobs-overview/:year", authenticateUser, getJobsOverview);
router.get("/api/get-years", authenticateUser, getYears);
router.get("/api/get-exporters", authenticateUser, getExporters);
router.get("/api/gandhidham/get-exporters", authenticateUser, getExportersGandhidham);
router.get("/api/get-hs-codes", authenticateUser, getHsCodes);
router.get("/api/get-suppliers", authenticateUser, getSuppliers);
router.get("/api/get-duties/:job_no", authenticateUser, getduty);
router.patch("/api/update-per-kg-cost", authenticateUser, updatePerKgCost);
router.patch("/api/gandhidham/update-per-kg-cost", authenticateUser, updatePerKgCostGandhidham);
router.patch("/api/update-job-duty-weight/:jobNo", authenticateUser, updateJobDutyAndWeight);
router.patch(
  "/api/gandhidham/update-job-duty-weight/:jobNo",
  authenticateUser,
  updateJobDutyAndWeightGandhidham,
);
// router.get("/api/lookup/:hsCode?/:jobNo/:year", lookup);

router.get("/api/lookup/:hsCode/:jobNo/:year", authenticateUser, lookup);
router.get("/api/lookup/:jobNo/:year", authenticateUser, lookup);
router.get("/api/gandhidham/lookup/:jobNo/:year", authenticateUser, lookupGandhidam);

router.post("/api/store-calculator-data/:jobNo", authenticateUser, storeCalculatorData);
router.post(
  "/api/gandhidham/store-calculator-data/:jobNo",
  authenticateUser,
  storeCalculatorDataGandhidham,
);

// Container Summary Analysis API
router.get("/api/container-summary", authenticateUser, getContainerSummary);

// Container Details API - Get detailed list of containers by status
router.get("/api/container-details", authenticateUser, getContainerDetails);

router.get("/api/gandhidham/container-summary", authenticateUser, getContainerSummaryGandhidham);
router.get("/api/gandhidham/container-details", authenticateUser, getContainerDetailsGandhidham);

export default router;
