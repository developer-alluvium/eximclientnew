// routes/aeoIntegrationRoutes.js
import express from "express";
import { AEOIntegrationService } from "../services/aeoIntegrationService.js";
import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Menu click - AEODirectory only
router.post("/api/aeo/menu-lookup", authenticateUser, async (req, res) => {
  try {
    const { importerName } = req.body;
    
    if (!importerName) {
      return res.status(400).json({
        success: false,
        message: "Importer name is required"
      });
    }

    const result = await AEOIntegrationService.lookupAEOFromMenu(importerName);
    res.json(result);

  } catch (error) {
    console.error("Menu AEO lookup error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch AEO data from directory"
    });
  }
});

// Profile click - Complete flow (Directory + AEO India)
router.post("/api/aeo/profile-lookup", authenticateUser, async (req, res) => {
  try {
    const { importerName, ieCode } = req.body;
    
    if (!importerName || !ieCode) {
      return res.status(400).json({
        success: false,
        message: "Importer name and IE code are required"
      });
    }

    const result = await AEOIntegrationService.lookupAEOFromProfile(importerName, ieCode);
    res.json(result);

  } catch (error) {
    console.error("Profile AEO lookup error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to complete AEO verification"
    });
  }
});

// Auto-verify all user importers (when accessing profile)
router.post("/api/aeo/auto-verify", authenticateUser, async (req, res) => {
  try {
    const result = await AEOIntegrationService.autoVerifyUserImporters(req.user.id);
    res.json(result);
  } catch (error) {
    console.error("Auto-verify error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to auto-verify importers"
    });
  }
});

// Get KYC summary
router.get("/api/aeo/kyc-summary", authenticateUser, async (req, res) => {
  try {
    const result = await AEOIntegrationService.getUserKYCSummary(req.user.id);
    res.json(result);
  } catch (error) {
    console.error("Get KYC summary error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch KYC summary"
    });
  }
});

// routes/aeoIntegrationRoutes.js
// Add this new route
router.post("/api/aeo/update-importer-name", authenticateUser, async (req, res) => {
  try {
    const { ieCode, importerName , userId} = req.body;
    
    if (!ieCode || !importerName) {
      return res.status(400).json({
        success: false,
        message: "IE code and importer name are required"
      });
    }

    const result = await AEOIntegrationService.updateImporterName(ieCode, importerName, userId);
    res.json(result);

  } catch (error) {
    console.error("Update importer name error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update importer name"
    });
  }
});

export default router;