import EximclientUser from '../models/eximclientUserModel.js';
import CustomerKycModel from '../models/customerKycModel.js';
import { logActivity } from '../utils/activityLogger.js';
import Notification from '../models/notificationModel.js';
import { validateIeCode, checkIeCodeAssignmentPermission } from '../utils/ieCodeValidator.js';

/**
 * Add an IE code assignment to a user
 */
export const assignIeCodeToUser = async (req, res) => {
  try {
    const actor = req.superAdmin || req.user;
    if (!actor) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { userId } = req.params;
    const { ieCodeNo, reason } = req.body;

    // Find user
    const user = await EximclientUser.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
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

    // Add IE code assignment
    user.addIeCodeAssignment(ieCodeNo, customerKyc.name_of_individual, actor);
    await user.save();

    // Create notification
    await Notification.create({
      type: 'ie_code_assigned',
      recipient: user._id,
      recipientModel: 'EximclientUser',
      sender: actor.id,
      senderModel: actor.role === 'superadmin' ? 'SuperAdmin' : 'Admin',
      title: 'IE Code Assigned',
      message: `IE Code ${ieCodeNo} and Importer ${customerKyc.name_of_individual} has been assigned to your account. ${reason ? 'Reason: ' + reason : ''}`
    });

    // Log activity
    await logActivity(
      actor.id,
      'USER_IE_CODE_ASSIGNED',
      `Assigned IEC ${ieCodeNo} and Importer ${customerKyc.name_of_individual} to user ${user.name}`,
      {
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        ieCodeNo,
        importerName: customerKyc.name_of_individual,
        customerKycId: customerKyc._id,
        reason,
        assignedBy: actor.id,
        assignerRole: actor.role || 'superadmin'
      },
      req.ip
    );

    res.json({
      success: true,
      message: "IE code assigned successfully.",
      data: {
        userId: user._id,
        assignedIeCodes: user.getAssignedIeCodes(),
        assignedAt: new Date()
      }
    });

  } catch (error) {
    console.error("Assign IE code to user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign IE code to user.",
      error: error.message
    });
  }
};

/**
 * Remove an IE code assignment from a user
 */
export const removeIeCodeFromUser = async (req, res) => {
  try {
    const actor = req.superAdmin || req.user;
    if (!actor) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { userId, ieCodeNo } = req.params;

    // Find user
    const user = await EximclientUser.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    // Security Check for Admins - they can only remove their own IE code
    if (actor.role === 'admin' && ieCodeNo !== actor.ie_code_no) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Admins can only remove their own IE Code from users."
      });
    }

    // Check if the IE code is assigned
    const assignment = user.ie_code_assignments.find(a => a.ie_code_no === ieCodeNo);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "This IE code is not assigned to the user."
      });
    }

    // Remove IE code assignment
    user.removeIeCodeAssignment(ieCodeNo);
    await user.save();

    // Create notification
    await Notification.create({
      type: 'ie_code_removed',
      recipient: user._id,
      recipientModel: 'EximclientUser',
      sender: actor.id,
      senderModel: actor.role === 'superadmin' ? 'SuperAdmin' : 'Admin',
      title: 'IE Code Removed',
      message: `IE Code ${ieCodeNo} has been removed from your account.`
    });

    // Log activity
    await logActivity(
      actor.id,
      'USER_IE_CODE_REMOVED',
      `Removed IEC ${ieCodeNo} from user ${user.name}`,
      {
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        ieCodeNo,
        removedBy: actor.id,
        removerRole: actor.role || 'superadmin'
      },
      req.ip
    );

    res.json({
      success: true,
      message: "IE code removed successfully.",
      data: {
        userId: user._id,
        remainingIeCodes: user.getAssignedIeCodes()
      }
    });

  } catch (error) {
    console.error("Remove IE code from user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove IE code from user.",
      error: error.message
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
        message: "User not found."
      });
    }

    // Get all assigned IE codes
    const ieCodes = user.getAssignedIeCodes();

    res.json({
      success: true,
      data: {
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        ieCodes
      }
    });

  } catch (error) {
    console.error("List user IE codes error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to list user IE codes.",
      error: error.message
    });
  }
};
