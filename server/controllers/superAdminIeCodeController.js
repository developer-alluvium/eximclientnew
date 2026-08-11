import EximclientUser from "../models/eximclientUserModel.js";
import CustomerKycModel from "../models/customerKycModel.js";
import Notification from "../models/notificationModel.js";
import axios from "axios";

/**
 * Assign additional IE code to a user
 */
export const assignAdditionalIeCode = async (req, res) => {
  try {
    const { userId } = req.params;
    const { ieCodes, reason, module: moduleType, exporterFilter } = req.body;
    // moduleType: 'import' (default) or 'export'
    const isExport = moduleType === 'export';

    const user = await EximclientUser.findById(userId);
    console.log(
      "Found target user:",
      user
        ? {
            id: user._id,
            name: user.name,
            email: user.email,
          }
        : "Not found"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Target user not found",
      });
    }

    // Convert single IE code to array for consistent handling
    const ieCodeList = Array.isArray(ieCodes) ? ieCodes : [ieCodes];
    const results = {
      success: [],
      failed: [],
    };

    // Determine which array to use
    const assignmentField = isExport ? 'exporter_ie_code_assignments' : 'ie_code_assignments';
    if (!user[assignmentField]) {
      user[assignmentField] = [];
    }

    for (const ieCodeNo of ieCodeList) {
      // Check if this IE code is already assigned in the target array
      const existingAssignment = user[assignmentField]?.find(
        (assignment) => assignment.ie_code_no === ieCodeNo.toUpperCase()
      );

      if (existingAssignment) {
        if (isExport && exporterFilter !== undefined && exporterFilter !== null && exporterFilter.trim() !== "") {
          existingAssignment.exporter_filter = exporterFilter.trim();
          results.success.push({
            ieCode: ieCodeNo,
            importerName: existingAssignment.importer_name,
            message: "Updated exporter sub-branch filter"
          });
          continue;
        }
        results.failed.push({
          ieCode: ieCodeNo,
          reason: `IE code already assigned to the user in ${isExport ? 'exporter' : 'importer'} module`,
        });
        continue;
      }

      // Get customer KYC details or exporter details for the IE code
      let importerName = null;
      const customerKyc = await CustomerKycModel.findOne({ iec_no: ieCodeNo });
      
      if (customerKyc && customerKyc.name_of_individual) {
        importerName = customerKyc.name_of_individual;
      } else {
        // Fallback to Export API directory
        try {
          const exportApiUrl = process.env.EXPORT_API_BASE_URL || "http://localhost:9002/api";
          console.log(`Checking Exporter API for IEC: ${ieCodeNo} at ${exportApiUrl}/directory/iec-codes`);
          const response = await axios.get(`${exportApiUrl}/directory/iec-codes`, {
            params: { search: ieCodeNo },
            timeout: 5000
          });
          
          if (response.data && response.data.success && Array.isArray(response.data.data)) {
            const exporter = response.data.data.find(
              (item) => item.iecNo && item.iecNo.trim().toUpperCase() === ieCodeNo.trim().toUpperCase()
            );
            if (exporter) {
              importerName = exporter.exporterName || exporter.alias || ieCodeNo;
            }
          }
        } catch (err) {
          console.error("Error querying Exporter API for IEC assignment:", err);
        }
      }

      if (!importerName) {
        results.failed.push({
          ieCode: ieCodeNo,
          reason: "No valid KYC or Exporter record found",
        });
        continue;
      }

      // Add new IE code assignment to the correct array
      const newAssignment = {
        ie_code_no: ieCodeNo.toUpperCase(),
        importer_name: importerName,
        exporter_filter: exporterFilter ? exporterFilter.trim() : null,
        assigned_at: new Date(),
        assigned_by: req.user._id,
        assigned_by_model: "SuperAdmin",
      };

      user[assignmentField].push(newAssignment);
      results.success.push({
        ieCode: ieCodeNo,
        importerName: importerName,
      });

      // Log activity
    }

    // Save the user with all successful assignments
    await user.save();

    return res.status(200).json({
      success: true,
      message: "IE code assignments processed",
      results,
    });
  } catch (error) {
    console.error("Error in assignAdditionalIeCode:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to assign IE codes",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Remove a specific IE code from a user
 */
export const removeIeCodeFromUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { ieCodes, module: moduleType } = req.body;
    // moduleType: 'import' | 'export' | undefined (undefined = remove from both)

    if (!Array.isArray(ieCodes) || ieCodes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "IE codes to remove are required.",
      });
    }

    const user = await EximclientUser.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const removedFrom = { import: [], export: [] };
    const notFound = [];

    for (const ieCodeNo of ieCodes) {
      const processedIeCodeNo = ieCodeNo.trim().toUpperCase();
      let found = false;

      // Remove from importer array (unless explicitly exporter-only)
      if (moduleType !== 'export') {
        const beforeLen = (user.ie_code_assignments || []).length;
        user.ie_code_assignments = (user.ie_code_assignments || []).filter(
          (a) => a.ie_code_no && a.ie_code_no.trim().toUpperCase() !== processedIeCodeNo
        );
        if ((user.ie_code_assignments || []).length < beforeLen) {
          removedFrom.import.push(processedIeCodeNo);
          found = true;
        }
      }

      // Remove from exporter array (unless explicitly importer-only)
      if (moduleType !== 'import') {
        const beforeLen = (user.exporter_ie_code_assignments || []).length;
        user.exporter_ie_code_assignments = (user.exporter_ie_code_assignments || []).filter(
          (a) => a.ie_code_no && a.ie_code_no.trim().toUpperCase() !== processedIeCodeNo
        );
        if ((user.exporter_ie_code_assignments || []).length < beforeLen) {
          removedFrom.export.push(processedIeCodeNo);
          found = true;
        }
      }

      if (!found) {
        notFound.push(processedIeCodeNo);
      }
    }

    // Don't allow removing all IE codes from an admin user
    // Check: admin must retain at least 1 importer or 1 exporter code total
    const remainingImporter = (user.ie_code_assignments || []).length;
    const remainingExporter = (user.exporter_ie_code_assignments || []).length;
    if (user.role === "admin" && remainingImporter === 0 && remainingExporter === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove all IE codes from an admin user. The admin must retain at least one importer or exporter IE code. Demote the user first.",
      });
    }

    await user.save();

    res.json({
      success: true,
      message: "IE code(s) removed successfully.",
      data: {
        userId: user._id,
        removedFrom,
        notFound,
        remainingImporterCodes: user.ie_code_assignments,
        remainingExporterCodes: user.exporter_ie_code_assignments,
      },
    });
  } catch (error) {
    console.error("Remove IE code error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove IE code.",
      error: error.message,
    });
  }
};

/**
 * List all IE codes assigned to a user
 */
export const listUserIeCodes = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await EximclientUser.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.json({
      success: true,
      data: {
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        importerIeCodes: user.ie_code_assignments,
        exporterIeCodes: user.exporter_ie_code_assignments || [],
        // Keep legacy field for backwards compat
        ieCodes: user.ie_code_assignments,
      },
    });
  } catch (error) {
    console.error("List user IE codes error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to list user IE codes.",
      error: error.message,
    });
  }
};

/**
 * Bulk assign additional IE codes to users
 * Supports module='import' (default) or module='export'
 */
export const bulkAssignAdditionalIeCodes = async (req, res) => {
  try {
    const { userIds, ieCodeNo, reason, module: moduleType } = req.body;
    const isExport = moduleType === 'export';
    const assignmentField = isExport ? 'exporter_ie_code_assignments' : 'ie_code_assignments';

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "userIds must be a non-empty array.",
      });
    }

    if (!ieCodeNo) {
      return res.status(400).json({
        success: false,
        message: "IE Code is required.",
      });
    }

    // Resolve entity name: check importer KYC first, then Exporter API directory
    let entityName = null;
    const customerKyc = await CustomerKycModel.findOne({ iec_no: ieCodeNo });
    if (customerKyc && customerKyc.name_of_individual) {
      entityName = customerKyc.name_of_individual;
    } else {
      // Fallback to Export API directory
      try {
        const exportApiUrl = process.env.EXPORT_API_BASE_URL || "http://localhost:9002/api";
        console.log(`Checking Exporter API for IEC: ${ieCodeNo} at ${exportApiUrl}/directory/iec-codes`);
        const response = await axios.get(`${exportApiUrl}/directory/iec-codes`, {
          params: { search: ieCodeNo },
          timeout: 5000
        });
        
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          const exporter = response.data.data.find(
            (item) => item.iecNo && item.iecNo.trim().toUpperCase() === ieCodeNo.trim().toUpperCase()
          );
          if (exporter) {
            entityName = exporter.exporterName || exporter.alias || ieCodeNo;
          }
        }
      } catch (err) {
        console.error("Error querying Exporter API for bulk IEC assignment:", err);
      }
    }

    if (!entityName) {
      return res.status(400).json({
        success: false,
        message: `Invalid or incomplete customer KYC or Exporter record for IEC ${ieCodeNo}.`,
      });
    }

    const users = await EximclientUser.find({ _id: { $in: userIds } });
    const notifications = [];
    let successCount = 0;
    let failureCount = 0;
    const errors = [];

    for (const user of users) {
      try {
        // Ensure the target array exists
        if (!user[assignmentField]) user[assignmentField] = [];

        // Skip if already assigned in the target module
        const alreadyAssigned = user[assignmentField].some(
          (a) => a.ie_code_no === ieCodeNo.toUpperCase()
        );
        if (alreadyAssigned) {
          errors.push({
            userId: user._id,
            name: user.name,
            error: `IE code already assigned in ${isExport ? 'exporter' : 'importer'} module`,
          });
          failureCount++;
          continue;
        }

        // Add IE code assignment to correct array
        const newAssignment = {
          ie_code_no: ieCodeNo.toUpperCase(),
          importer_name: entityName,
          assigned_at: new Date(),
          assigned_by: req.user._id,
          assigned_by_model: "SuperAdmin",
        };
        user[assignmentField].push(newAssignment);
        await user.save();
        successCount++;
      } catch (error) {
        console.error(`Failed to assign IE code to user ${user._id}:`, error);
        failureCount++;
        errors.push({
          userId: user._id,
          name: user.name,
          error: error.message,
        });
      }
    }

    // Create notifications in bulk (if any)
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    res.json({
      success: true,
      message: `IE code assignments completed: ${successCount} successful, ${failureCount} failed`,
      data: {
        ieCodeNo,
        entityName,
        module: isExport ? 'export' : 'import',
        successCount,
        failureCount,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("Bulk assign additional IE code error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to bulk assign additional IE code.",
      error: error.message,
    });
  }
};

/**
 * PUT /api/superadmin/users/:userId/ie-codes/filter
 * Updates the exporter_filter (sub-branch filter) on an assigned IE code for a user.
 */
export const updateIeCodeFilter = async (req, res) => {
  try {
    const { userId } = req.params;
    const { ieCode, exporterFilter, module: moduleType } = req.body;

    if (!ieCode) {
      return res.status(400).json({ success: false, message: "IE code is required." });
    }

    const user = await EximclientUser.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const targetCode = ieCode.trim().toUpperCase();
    const isExport = moduleType === "export";
    const assignmentField = isExport ? "exporter_ie_code_assignments" : "ie_code_assignments";

    let assignment = (user[assignmentField] || []).find(
      (a) => a.ie_code_no && a.ie_code_no.trim().toUpperCase() === targetCode
    );

    // If not found in specified array, fallback to check the other array
    if (!assignment) {
      const otherField = isExport ? "ie_code_assignments" : "exporter_ie_code_assignments";
      assignment = (user[otherField] || []).find(
        (a) => a.ie_code_no && a.ie_code_no.trim().toUpperCase() === targetCode
      );
    }

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: `IE Code ${targetCode} is not assigned to this user.`,
      });
    }

    assignment.exporter_filter = exporterFilter ? exporterFilter.trim() : null;
    await user.save();

    res.json({
      success: true,
      message: `Exporter filter updated for IE code ${targetCode}`,
      data: {
        ie_code_no: assignment.ie_code_no,
        importer_name: assignment.importer_name,
        exporter_filter: assignment.exporter_filter,
      },
    });
  } catch (error) {
    console.error("Update IE code filter error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update IE code filter.",
      error: error.message,
    });
  }
};
