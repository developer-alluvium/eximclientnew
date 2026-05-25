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
    const { ieCodes, reason } = req.body;


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

    for (const ieCodeNo of ieCodeList) {
      // Check if this IE code is already assigned
      const existingAssignment = user.ie_code_assignments?.find(
        (assignment) => assignment.ie_code_no === ieCodeNo.toUpperCase()
      );

      if (existingAssignment) {
        results.failed.push({
          ieCode: ieCodeNo,
          reason: "IE code already assigned to the user",
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
          console.error("Error querying Exporter API for IEC assignment:", err.message);
        }
      }

      if (!importerName) {
        results.failed.push({
          ieCode: ieCodeNo,
          reason: "No valid KYC or Exporter record found",
        });
        continue;
      }

      // Add new IE code assignment
      const newAssignment = {
        ie_code_no: ieCodeNo.toUpperCase(),
        importer_name: importerName,
        assigned_at: new Date(),
        assigned_by: req.user._id,
        assigned_by_model: "SuperAdmin",
      };

      // Initialize ie_code_assignments array if it doesn't exist
      if (!user.ie_code_assignments) {
        user.ie_code_assignments = [];
      }

      user.ie_code_assignments.push(newAssignment);
      results.success.push({
        ieCode: ieCodeNo,
        importerName: importerName,
      });

      // Log activity
    }

    // Save the user with all successful assignments
    await user.save();

    // Create notification for the user

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

    const { ieCodes } = req.body;
    const ieCodeNo =
      Array.isArray(ieCodes) && ieCodes.length > 0 ? ieCodes[0] : null;

    if (!ieCodeNo) {
      return res.status(400).json({
        success: false,
        message: "IE code to remove is required.",
      });
    }

    console.log(req.body);

    const user = await EximclientUser.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Check if this IE code is assigned
    console.log("Checking IE code assignments for user:", user._id);
    user.ie_code_assignments?.forEach((assignment, index) => {
      console.log(`Assignment #${index}:`, assignment);
    });

    const processedIeCodeNo = ieCodeNo ? ieCodeNo.trim().toUpperCase() : null;

    const existingAssignment = user.ie_code_assignments?.find((assignment) => {
      if (!assignment.ie_code_no) {
        console.warn(`Assignment at index missing ie_code_no:`, assignment);
        return false; // skip this
      }
      const normalizedAssignmentIeCode = assignment.ie_code_no
        .trim()
        .toUpperCase();
      console.log(
        `Comparing ${normalizedAssignmentIeCode} with ${processedIeCodeNo}`
      );
      return normalizedAssignmentIeCode === processedIeCodeNo;
    });

    if (!existingAssignment) {
      return res.status(400).json({
        success: false,
        message: "This IE code is not assigned to the user.",
      });
    }

    // Don't allow removing the last IE code if user is an admin
    if (user.role === "admin" && user.ie_code_assignments.length === 1) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot remove the last IE code from an admin user. Demote the user first.",
      });
    }

    // Remove IE code assignment

    user.ie_code_assignments = user.ie_code_assignments.filter(
      (assignment) =>
        !(
          assignment.ie_code_no &&
          assignment.ie_code_no.trim().toUpperCase() === processedIeCodeNo
        )
    );

    await user.save();

    // Create notification

    // Log activity

    res.json({
      success: true,
      message: "IE code removed successfully.",
      data: {
        userId: user._id,
        remainingIeCodes: user.ie_code_assignments,
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
 */
export const bulkAssignAdditionalIeCodes = async (req, res) => {
  try {
    const { userIds, ieCodeNo, reason } = req.body;

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

    // Get customer KYC details or exporter details
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
        console.error("Error querying Exporter API for bulk IEC assignment:", err.message);
      }
    }

    if (!importerName) {
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
        // Skip if already assigned
        if (
          user.ie_code_assignments?.some(
            (a) => a.ie_code_no === ieCodeNo.toUpperCase()
          )
        ) {
          errors.push({
            userId: user._id,
            name: user.name,
            error: "IE code already assigned",
          });
          failureCount++;
          continue;
        }

        // Add IE code assignment
        user.addIeCodeAssignment(
          ieCodeNo,
          importerName,
          req.user
        );
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

    // Create notifications in bulk
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    res.json({
      success: true,
      message: `IE code assignments completed: ${successCount} successful, ${failureCount} failed`,
      data: {
        ieCodeNo,
        importerName,
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
