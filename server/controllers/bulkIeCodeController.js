import EximclientUser from '../models/eximclientUserModel.js';
import { logActivity } from '../utils/activityLogger.js';
import Notification from '../models/notificationModel.js';
import { validateIeCode, checkIeCodeAssignmentPermission } from '../utils/ieCodeValidator.js';

/**
 * Bulk assign IE codes to multiple users
 */
export const bulkAssignIeCodeToUsers = async (req, res) => {
  try {
    const actor = req.superAdmin || req.user;
    if (!actor) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { userIds, ieCodeNo, reason } = req.body;

    // Validate required fields
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "userIds must be a non-empty array."
      });
    }

    if (!ieCodeNo) {
      return res.status(400).json({
        success: false,
        message: "IE Code is required."
      });
    }

    // Check admin's permission to assign this IE code
    const { isAllowed, error: permissionError } = checkIeCodeAssignmentPermission(actor, ieCodeNo);
    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: permissionError
      });
    }

    // Validate the IE code
    const { isValid, customerKyc, error: validationError } = await validateIeCode(ieCodeNo);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }

    // Find users and update their IE code assignments
    const users = await EximclientUser.find({ _id: { $in: userIds } });
    const notifications = [];
    let successCount = 0;
    let failureCount = 0;
    const errors = [];

    for (const user of users) {
      try {
        // Add IE code assignment
        user.addIeCodeAssignment(ieCodeNo, customerKyc.name_of_individual, actor);
        await user.save();
        successCount++;

        // Queue notification
        notifications.push({
          type: 'ie_code_assigned',
          recipient: user._id,
          recipientModel: 'EximclientUser',
          sender: actor.id,
          senderModel: actor.role === 'superadmin' ? 'SuperAdmin' : 'Admin',
          title: 'IE Code Assigned',
          message: `IE Code ${ieCodeNo} and Importer ${customerKyc.name_of_individual} has been assigned to your account. ${reason ? 'Reason: ' + reason : ''}`
        });
      } catch (error) {
        console.error(`Failed to assign IE code to user ${user._id}:`, error);
        failureCount++;
        errors.push({
          userId: user._id,
          name: user.name,
          error: error.message
        });
      }
    }

    // Create notifications in bulk
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    // Log activity
 

    res.json({
      success: true,
      message: `IE code assignments completed: ${successCount} successful, ${failureCount} failed`,
      data: {
        ieCodeNo,
        importerName: customerKyc.name_of_individual,
        successCount,
        failureCount,
        errors: errors.length > 0 ? errors : undefined,
        assignedBy: actor.id,
        assignedAt: new Date()
      }
    });

  } catch (error) {
    console.error("Bulk assign IE code error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to bulk assign IE code to users.",
      error: error.message
    });
  }
};
