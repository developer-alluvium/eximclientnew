// routes/searchRoutes.js
import express from "express";
import EximclientUser from "../models/eximclientUserModel.js";
import CustomerKycModel from "../models/customerKycModel.js";
import { authenticateUser } from "../middlewares/authMiddleware.js";
import { runLookup } from "../utils/aeoLookup.js"; // We'll create this

const router = express.Router();

// Search importers by name and IE code
router.post("/api/search/importer", authenticateUser, async (req, res) => {
  try {
    const { importerName, ieCode } = req.body;

    if (!importerName && !ieCode) {
      return res.status(400).json({
        success: false,
        message: "Please provide either importer name or IE code",
      });
    }

    const user = await EximclientUser.findById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Build search query for user's assigned importers
    let searchQuery = { _id: req.user.id };

    // Search within ie_code_assignments array
    const assignmentsQuery = {};

    if (importerName) {
      assignmentsQuery["ie_code_assignments.importer_name"] = {
        $regex: importerName,
        $options: "i",
      };
    }

    if (ieCode) {
      assignmentsQuery["ie_code_assignments.ie_code_no"] = {
        $regex: ieCode.replace(/\s+/g, ""), // Remove spaces for search
        $options: "i",
      };
    }

    // If we have search criteria, add them to the query
    if (Object.keys(assignmentsQuery).length > 0) {
      searchQuery.$and = [searchQuery, assignmentsQuery];
    }

    const result = await EximclientUser.findOne(searchQuery).select(
      "ie_code_assignments name email"
    );

    if (
      !result ||
      !result.ie_code_assignments ||
      result.ie_code_assignments.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message: "No importers found matching your criteria",
      });
    }

    // Filter assignments based on search criteria
    let filteredAssignments = result.ie_code_assignments;

    if (importerName) {
      filteredAssignments = filteredAssignments.filter((assignment) =>
        assignment.importer_name
          .toLowerCase()
          .includes(importerName.toLowerCase())
      );
    }

    if (ieCode) {
      const cleanIeCode = ieCode.replace(/\s+/g, "").toUpperCase();
      filteredAssignments = filteredAssignments.filter((assignment) =>
        assignment.ie_code_no
          .replace(/\s+/g, "")
          .toUpperCase()
          .includes(cleanIeCode)
      );
    }

    // Group by IE code number
    const assignmentsByIeCode = {};
    filteredAssignments.forEach((assignment) => {
      const cleanIeCode = assignment.ie_code_no
        .replace(/\s+/g, "")
        .toUpperCase();
      if (!assignmentsByIeCode[cleanIeCode]) {
        assignmentsByIeCode[cleanIeCode] = [];
      }
      assignmentsByIeCode[cleanIeCode].push({
        id: assignment._id,
        importer_name: assignment.importer_name,
        ie_code_no: assignment.ie_code_no,
        assigned_at: assignment.assigned_at,
      });
    });

    // Prepare response
    const response = {
      success: true,
      user: {
        name: result.name,
        email: result.email,
      },
      searchResults: Object.keys(assignmentsByIeCode).map((ieCode) => ({
        ie_code_no: ieCode,
        importers: assignmentsByIeCode[ieCode],
        hasMultipleImporters: assignmentsByIeCode[ieCode].length > 1,
      })),
    };

    res.json(response);
  } catch (error) {
    console.error("Error searching importers:", error);
    res.status(500).json({
      success: false,
      message: "Server error during search",
    });
  }
});

// Verify IE code and fetch AEO data
router.post("/api/verify-iecode", authenticateUser, async (req, res) => {
  try {
    const { ieCode, selectedImporterName } = req.body;

    if (!ieCode) {
      return res.status(400).json({
        success: false,
        message: "IE code is required",
      });
    }

    // Verify the IE code belongs to the user's assigned importers
    const user = await EximclientUser.findOne({
      _id: req.user.id,
      "ie_code_assignments.ie_code_no": new RegExp(
        `^${ieCode.replace(/\s+/g, "")}$`,
        "i"
      ),
    });

    if (!user) {
      return res.status(403).json({
        success: false,
        message: "IE code not assigned to your account",
      });
    }

    // Find the specific assignment
    const assignment = user.ie_code_assignments.find(
      (assign) =>
        assign.ie_code_no.replace(/\s+/g, "").toUpperCase() ===
        ieCode.replace(/\s+/g, "").toUpperCase()
    );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "IE code assignment not found",
      });
    }

    // Use the provided importer name or get from assignment
    const importerName = selectedImporterName || assignment.importer_name;

    // Fetch AEO data using the Node.js script
    let aeoData = null;
    try {
      aeoData = await runLookup(importerName);

      // Check if we already have a KYC record for this IE code
      let kycRecord = await CustomerKycModel.findOne({
        iec_no: ieCode.replace(/\s+/g, "").toUpperCase(),
      });

      if (kycRecord) {
        // Update existing KYC record with AEO data
        kycRecord = await CustomerKycModel.findOneAndUpdate(
          { iec_no: ieCode.replace(/\s+/g, "").toUpperCase() },
          {
            $set: {
              name_of_individual: importerName,
              aeo_tier: aeoData.aeo_tier || "",
              certificate_no: aeoData.certificate_no || "",
              certificate_issue_date: aeoData.certificate_issue_date || null,
              certificate_validity_date:
                aeoData.certificate_validity_date || null,
              certificate_present_validity_date:
                aeoData.certificate_present_validity_date || null,
              certificate_present_validity_status:
                aeoData.certificate_present_validity_status || "",
            },
          },
          { new: true }
        );
      } else {
        // Create new KYC record
        kycRecord = new CustomerKycModel({
          module: "AEO Verification",
          category: "Importer",
          name_of_individual: importerName,
          status: "pending",
          iec_no: ieCode.replace(/\s+/g, "").toUpperCase(),
          aeo_tier: aeoData.aeo_tier || "",
          certificate_no: aeoData.certificate_no || "",
          certificate_issue_date: aeoData.certificate_issue_date || null,
          certificate_validity_date: aeoData.certificate_validity_date || null,
          certificate_present_validity_date:
            aeoData.certificate_present_validity_date || null,
          certificate_present_validity_status:
            aeoData.certificate_present_validity_status || "",
        });
        await kycRecord.save();
      }
    } catch (aeoError) {
      console.error("AEO lookup failed:", aeoError);
      // Continue even if AEO lookup fails
    }

    // Prepare response data
    const response = {
      success: true,
      verification: {
        ie_code_no: ieCode.replace(/\s+/g, "").toUpperCase(),
        importer_name: importerName,
        is_valid: true,
        verified_at: new Date(),
      },
      aeo_data: aeoData || { message: "AEO data not available" },
      kyc_record: kycRecord
        ? {
            id: kycRecord._id,
            status: kycRecord.status,
            aeo_tier: kycRecord.aeo_tier,
            certificate_no: kycRecord.certificate_no,
          }
        : null,
    };

    res.json(response);
  } catch (error) {
    console.error("Error verifying IE code:", error);
    res.status(500).json({
      success: false,
      message: "Server error during verification",
    });
  }
});

// Get KYC details for an IE code
router.get("/api/kyc-details/:ieCode", authenticateUser, async (req, res) => {
  try {
    const { ieCode } = req.params;

    const kycRecord = await CustomerKycModel.findOne({
      iec_no: ieCode.replace(/\s+/g, "").toUpperCase(),
    });

    if (!kycRecord) {
      return res.status(404).json({
        success: false,
        message: "KYC record not found for this IE code",
      });
    }

    res.json({
      success: true,
      kyc_details: {
        importer_name: kycRecord.name_of_individual,
        iec_no: kycRecord.iec_no,
        aeo_tier: kycRecord.aeo_tier,
        certificate_no: kycRecord.certificate_no,
        certificate_issue_date: kycRecord.certificate_issue_date,
        certificate_validity_date: kycRecord.certificate_validity_date,
        certificate_present_validity_date:
          kycRecord.certificate_present_validity_date,
        certificate_present_validity_status:
          kycRecord.certificate_present_validity_status,
        status: kycRecord.status,
        created_at: kycRecord.createdAt,
        updated_at: kycRecord.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching KYC details:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching KYC details",
    });
  }
});

export default router;
