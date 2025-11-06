// services/aeoReminderService.js (Example cron job)
import EximclientUser from "../models/eximclientUserModel.js";
import CustomerKycModel from "../models/customerKycModel.js";
import { sendAEOCertificateReminderEmail } from "./emailService.js";

export const checkAndSendAEOReminders = async () => {
  try {
    console.log("🔔 Starting AEO certificate reminder check...");

    // Get all users with AEO reminder enabled
    const users = await EximclientUser.find({
      aeo_reminder_enabled: true,
      ie_code_assignments: { $exists: true, $ne: [] },
    }).select("name email aeo_reminder_days ie_code_assignments");

    let totalRemindersSent = 0;

    for (const user of users) {
      const userIeCodes = user.ie_code_assignments.map(
        (assign) => assign.ie_code_no
      );
      const reminderDays = user.aeo_reminder_days || 90;

      // Get user's AEO certificates
      const certificates = await CustomerKycModel.find({
        iec_no: { $in: userIeCodes },
        certificate_validity_date: { $exists: true, $ne: null },
      });

      const today = new Date();

      for (const certificate of certificates) {
        const validityDate = new Date(certificate.certificate_validity_date);
        const daysUntilExpiry = Math.ceil(
          (validityDate - today) / (1000 * 60 * 60 * 24)
        );

        // Send reminder if certificate is expiring within the user's reminder days
        if (daysUntilExpiry > 0 && daysUntilExpiry <= reminderDays) {
          try {
            await sendAEOCertificateReminderEmail(
              user.email,
              user.name,
              certificate,
              daysUntilExpiry
            );
            console.log(
              `✅ Sent AEO reminder to ${user.email} for ${certificate.name_of_individual} (${daysUntilExpiry} days left)`
            );
            totalRemindersSent++;
          } catch (emailError) {
            console.error(
              `❌ Failed to send reminder to ${user.email}:`,
              emailError
            );
          }
        }
      }
    }

    console.log(
      `🎉 AEO reminder check completed. Sent ${totalRemindersSent} reminders.`
    );
    return totalRemindersSent;
  } catch (error) {
    console.error("❌ Error in AEO reminder service:", error);
    throw error;
  }
};
