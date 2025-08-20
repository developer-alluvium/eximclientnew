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
  getContainerDetails
} from "../controllers/jobController.js";
import {
  getJobsByStatusAndImporter,
  updateContainerTransporter,
  updateJob,
} from "../controllers/jobStatusController.js";
import { getJobsOverview } from "../controllers/jobOverviewController.js";
import {
  getJobsByIECode,
  getJobsMultiStatus
} from "../controllers/optimizedJobController.js";

import { getJobsByStatusAndImporterGandhidham, getImporterJobCountsGandhidham } from "../controllers/gandhidhamController.js";

const router = express.Router();

router.get("/api/get-importer-jobs/:importerURL/:year", getImporterJobCounts);
router.get("/api/get-job/:year/:jobNo", getJobByNumber);
router.get("/api/get-job-numbers/:ie_code_no", getJobNumbersByIECode); // Supports ?year= query param

// Optimized routes for IE code based filtering
router.get("/api/optimized/:year/jobs/:ieCode/:status", getJobsByIECode);
router.get("/api/optimized/:year/jobs/:ieCode/all", getJobsMultiStatus);

router.get(
  "/api/:year/jobs/:status/:detailedStatus/:importer",
  getJobsByStatusAndImporter
);
// Gandhidham jobs route
router.get(
  "/api/gandhidham/:year/jobs/:status/:detailedStatus/:importer",
  getJobsByStatusAndImporterGandhidham
);

router.get("/api/gandhidham/get-importer-jobs/:importerURL/:year", getImporterJobCountsGandhidham);

router.patch("/api/jobs/:id", updateJob);

router.patch('/api/jobs/container/:id', updateContainerTransporter);


// Route to get jobs overview
router.get("/api/get-jobs-overview/:year", getJobsOverview);
router.get("/api/get-years", getYears);
router.get("/api/get-exporters", getExporters);
router.get("/api/get-hs-codes", getHsCodes);
router.get("/api/get-suppliers", getSuppliers);
router.get("/api/get-duties/:job_no", getduty);
router.patch("/api/update-per-kg-cost", updatePerKgCost);
router.patch("/api/update-job-duty-weight/:jobNo", updateJobDutyAndWeight);
// router.get("/api/lookup/:hsCode?/:jobNo/:year", lookup);

router.get("/api/lookup/:hsCode/:jobNo/:year", lookup);
router.get("/api/lookup/:jobNo/:year", lookup);

router.post("/api/store-calculator-data/:jobNo", storeCalculatorData);

// Container Summary Analysis API
router.get("/api/container-summary", getContainerSummary);

// Container Details API - Get detailed list of containers by status
router.get("/api/container-details", getContainerDetails);

export default router;
