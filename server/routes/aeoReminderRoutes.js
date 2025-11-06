// routes/aeoReminderRoutes.js
import express from "express";
import EximclientUser from "../models/eximclientUserModel.js";
import CustomerKycModel from "../models/customerKycModel.js";
import { sendAEOCertificateReminderEmail } from "../services/emailService.js";
import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Get AEO reminder settings
router.get("/api/aeo/reminder-settings", authenticateUser, async (req, res) => {
  try {
    const user = await EximclientUser.findById(req.user.id).select(
      "aeo_reminder_days aeo_reminder_enabled name email ie_code_assignments"
    );

    res.json({
      success: true,
      settings: {
        reminder_days: user.aeo_reminder_days,
        reminder_enabled: user.aeo_reminder_enabled,
      },
    });
  } catch (error) {
    console.error("Error fetching AEO reminder settings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reminder settings",
    });
  }
});

// Update AEO reminder settings
router.put("/api/aeo/reminder-settings", authenticateUser, async (req, res) => {
  try {
    const { reminder_days, reminder_enabled } = req.body;

    const updateData = {};

    if (reminder_days !== undefined) {
      if (reminder_days < 1 || reminder_days > 365) {
        return res.status(400).json({
          success: false,
          message: "Reminder days must be between 1 and 365",
        });
      }
      updateData.aeo_reminder_days = reminder_days;
    }

    if (reminder_enabled !== undefined) {
      updateData.aeo_reminder_enabled = reminder_enabled;
    }

    const user = await EximclientUser.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true }
    ).select("aeo_reminder_days aeo_reminder_enabled name email");

    res.json({
      success: true,
      message: "AEO reminder settings updated successfully",
      settings: {
        reminder_days: user.aeo_reminder_days,
        reminder_enabled: user.aeo_reminder_enabled,
      },
    });
  } catch (error) {
    console.error("Error updating AEO reminder settings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update reminder settings",
    });
  }
});

// Test AEO reminder for user
router.post("/api/aeo/test-reminder", authenticateUser, async (req, res) => {
  try {
    const user = await EximclientUser.findById(req.user.id).select(
      "name email aeo_reminder_days ie_code_assignments"
    );

    if (!user.ie_code_assignments || user.ie_code_assignments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No IE code assignments found for this user",
      });
    }

    // Get user's IE codes
    const userIeCodes = user.ie_code_assignments.map(
      (assign) => assign.ie_code_no
    );

    // Get user's AEO certificates
    const kycRecords = await CustomerKycModel.find({
      iec_no: { $in: userIeCodes },
    });

    if (kycRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No AEO certificates found for your IE codes",
      });
    }

    // Use the first certificate for testing
    const testCertificate = kycRecords[0];

    // Validate certificate has required fields
    if (!testCertificate.certificate_validity_date) {
      return res.status(400).json({
        success: false,
        message: "Test certificate missing validity date",
      });
    }

    const daysUntilExpiry = user.aeo_reminder_days || 90;

    console.log(`🧪 Test AEO reminder triggered for user: ${user.email}`);
    console.log(
      `📧 Email will be sent FROM: ${process.env.MAIL_FROM_NAME} <${process.env.MAIL_FROM}>`
    );
    console.log(`📧 Email will be sent TO: ${user.email}`);
    console.log(`📋 Certificate details:`, {
      importer: testCertificate.name_of_individual,
      ie_code: testCertificate.iec_no,
      validity_date: testCertificate.certificate_validity_date,
      certificate_no: testCertificate.certificate_no,
    });

    // Send test reminder email
    await sendAEOCertificateReminderEmail(
      user.email,
      user.name,
      testCertificate,
      daysUntilExpiry
    );

    res.json({
      success: true,
      message: "Test AEO reminder sent successfully",
      details: {
        sent_from: `${process.env.MAIL_FROM_NAME} <${process.env.MAIL_FROM}>`,
        sent_to: user.email,
        certificate: testCertificate.name_of_individual,
        ie_code: testCertificate.iec_no,
        reminder_days: daysUntilExpiry,
      },
    });
  } catch (error) {
    console.error("Error triggering test reminder:", error);
    res.status(500).json({
      success: false,
      message: `Failed to trigger test reminder: ${error.message}`,
    });
  }
});

export default router;
