import express from "express";
import { authenticateUser } from "../middlewares/authMiddleware.js";
import {
  proxyFreightEnquiries,
  proxyHistoricalFreight,
  proxyPorts,
  proxyFreightDsrDownload,
} from "../controllers/freightProxyController.js";

const router = express.Router();

router.get("/api/freight-enquiries", authenticateUser, proxyFreightEnquiries);
router.get("/api/export-dsr/historical-freight", authenticateUser, proxyHistoricalFreight);
router.get("/api/ports", authenticateUser, proxyPorts);
router.get("/api/freight-forwarding/generate-dsr", authenticateUser, proxyFreightDsrDownload);

export default router;
