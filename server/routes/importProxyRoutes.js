 import express from "express";
import {
  getImporterJobCounts,
  getJobByNumber,
  proxyImportListing,
  updateJob,
  updateContainerTransporter,
  getContainerSummary,
  getContainerDetails,
  getExporters,
  getYears,
  getImporterUsers,
  getJobNumbersByMultipleIECodes,
  getBeNumbersByMultipleIECodes,
  lookup,
  storeCalculatorData,
  updatePerKgCost,
  updateJobDutyAndWeight,
  getduty,
  getBranches,
  getJobNumbersByIECode,
  getJobsByIECode,
  getJobsMultiStatus,
  getUserDashboardStats,
  getJobsOverview,
  getHsCodes,
  getSuppliers,
  getImporterList,
  downloadReport,
  downloadAllReport
} from "../controllers/importProxyController.js";
import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Get branches dynamically
router.get("/api/get-branches", authenticateUser, getBranches);

// Importer Job Counts / Statistics
router.get("/api/get-importer-jobs/:importerURL/:year", authenticateUser, getImporterJobCounts);
router.get("/api/gandhidham/get-importer-jobs/:importerURL/:year", authenticateUser, getImporterJobCounts);

// Single Job Fetch
router.get("/api/get-job/:year/:jobNo", authenticateUser, getJobByNumber);

// Listing Endpoints
router.get("/api/:year/jobs/:status/:detailedStatus/:customHouse/multiple", authenticateUser, proxyImportListing);
router.get("/api/:year/jobs/:status/:detailedStatus/:importer", authenticateUser, proxyImportListing);
router.get("/api/gandhidham/:year/jobs/:status/:detailedStatus/:customHouse/multiple", authenticateUser, proxyImportListing);

// Job / Container Updates
router.patch("/api/jobs/:id", authenticateUser, updateJob);
router.patch("/api/jobs/container/:id", authenticateUser, updateContainerTransporter);

// Container Analytics & Summaries
router.get("/api/container-summary", authenticateUser, getContainerSummary);
router.get("/api/container-details", authenticateUser, getContainerDetails);
router.get("/api/gandhidham/container-summary", authenticateUser, getContainerSummary);
router.get("/api/gandhidham/container-details", authenticateUser, getContainerDetails);

// Exporter Filter Options
router.get("/api/get-exporters", authenticateUser, getExporters);
router.get("/api/gandhidham/get-exporters", authenticateUser, getExporters);

// Dynamic dropdown lists & utils
router.get("/api/get-years", authenticateUser, getYears);
router.get("/api/get-importer-users", authenticateUser, getImporterUsers);
router.get("/api/get-duties/:job_no", authenticateUser, getduty);
router.get("/api/get-importer-list/:year", authenticateUser, getImporterList);
router.get("/api/download-report/:yearString/:importer/:status", authenticateUser, downloadReport);
router.get("/api/download-report/:yearString/:status", authenticateUser, downloadAllReport);

// Job & BE Number lookups
router.get("/api/get-job-numbers/multiple", authenticateUser, getJobNumbersByMultipleIECodes);
router.get("/api/get-be-numbers/multiple", authenticateUser, getBeNumbersByMultipleIECodes);
router.get("/api/gandhidham/get-job-numbers/multiple", authenticateUser, getJobNumbersByMultipleIECodes);
router.get("/api/gandhidham/get-be-numbers/multiple", authenticateUser, getBeNumbersByMultipleIECodes);

// HS Code & Job lookups
router.get("/api/lookup/:hsCode/:jobNo/:year", authenticateUser, lookup);
router.get("/api/lookup/:jobNo/:year", authenticateUser, lookup);
router.get("/api/gandhidham/lookup/:jobNo/:year", authenticateUser, lookup);

// Cost Calculator & Weight Duty stores
router.post("/api/store-calculator-data/:jobNo", authenticateUser, storeCalculatorData);
router.post("/api/gandhidham/store-calculator-data/:jobNo", authenticateUser, storeCalculatorData);

router.patch("/api/update-per-kg-cost", authenticateUser, updatePerKgCost);
router.patch("/api/gandhidham/update-per-kg-cost", authenticateUser, updatePerKgCost);

router.patch("/api/update-job-duty-weight/:jobNo", authenticateUser, updateJobDutyAndWeight);
router.patch("/api/gandhidham/update-job-duty-weight/:jobNo", authenticateUser, updateJobDutyAndWeight);

// Legacy jobRoutes.js routes, now proxied
router.get("/api/get-job-numbers/:ie_code_no", authenticateUser, getJobNumbersByIECode);
router.get("/api/optimized/:year/jobs/:ieCode/:status", authenticateUser, getJobsByIECode);
router.get("/api/optimized/:year/jobs/:ieCode/all", authenticateUser, getJobsMultiStatus);
router.get("/api/user-dashboard-stats", authenticateUser, getUserDashboardStats);
router.get("/api/get-jobs-overview/:year", authenticateUser, getJobsOverview);
router.get("/api/get-hs-codes", authenticateUser, getHsCodes);
router.get("/api/get-suppliers", authenticateUser, getSuppliers);

export default router;
