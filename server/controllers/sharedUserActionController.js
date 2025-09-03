// src/controllers/sharedUserActionsController.js

import EximclientUser from "../models/eximclientUserModel.js";
import CustomerModel from "../models/customerModel.js";
import Notification from "../models/notificationModel.js";
import { logActivity } from "../utils/activityLogger.js";

/**
 * Utility function to check if actor can manage target user based on IE code assignments
 */
const canManageUser = (actor, targetUser) => {
  if (actor.role === 'superadmin') return true;
  
  if (actor.role === 'admin') {
    // Get actor's assigned IE codes
    const actorIeCodes = actor.ie_code_assignments?.map(a => a.ie_code_no) || [actor.ie_code_no];
    
    // Get target user's assigned IE codes
    const targetIeCodes = targetUser.ie_code_assignments?.map(a => a.ie_code_no) || [targetUser.ie_code_no];
    
    // Check if there's any overlap between actor's and target's IE codes
    return targetIeCodes.some(code => actorIeCodes.includes(code));
  }
  
  return false;
};

/**
 * Generic function to promote a user to an admin.
 * Can be called by a SuperAdmin or an Admin.
 */
export const promoteUserToAdmin = async (req, res) => {
  try {
    // 1. Identify the actor (who is making the request)
    const actor = req.superAdmin || req.user;
    if (!actor) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { userId } = req.params;
    const user = await EximclientUser.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    
    // 2. Security check using multiple IE codes
    if (!canManageUser(actor, user)) {
      return res.status(403).json({ 
        success: false, 
        message: "Forbidden: You can only manage users within your assigned IE Codes." 
      });
    }

    // Get the primary IE code for customer lookup (use first assignment or legacy field)
    const primaryIeCode = user.ie_code_assignments?.[0]?.ie_code_no || user.ie_code_no;
    
    const customer = await CustomerModel.findOne({ ie_code_no: primaryIeCode });
    if (!customer) {
      return res.status(400).json({ success: false, message: `No customer found with IE code ${primaryIeCode}.` });
    }

    if (customer.role === 'admin') {
      return res.status(400).json({ success: false, message: "This customer is already an admin." });
    }

    // Update records
    user.role = 'admin';
    await user.save();

    customer.role = 'admin';
    customer.roleGrantedBy = actor.id;
    customer.roleGrantedAt = new Date();
    await customer.save();

    // Log activity
    await logActivity(
      actor.id,
      'USER_PROMOTED_TO_ADMIN',
      `Promoted user ${user.name} to admin`,
      { 
        userId: user._id, 
        customerId: customer._id, 
        promotedBy: actor.id, 
        promoterRole: actor.role || 'superadmin',
        userIeCodeAssignments: user.ie_code_assignments
      },
      req.ip
    );

    res.json({
      success: true,
      message: "User promoted to admin successfully.",
      data: { user, customer },
    });

  } catch (error) {
    console.error("Promote user to admin error:", error);
    res.status(500).json({ success: false, message: "Failed to promote user to admin." });
  }
};

/**
 * Generic function to demote a user from an admin.
 * Can be called by a SuperAdmin or an Admin.
 */
export const demoteUserFromAdmin = async (req, res) => {
  try {
    const actor = req.superAdmin || req.user;
    if (!actor) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { userId } = req.params;
    const user = await EximclientUser.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    
    // Security check using multiple IE codes
    if (!canManageUser(actor, user)) {
      return res.status(403).json({ 
        success: false, 
        message: "Forbidden: You can only manage users within your assigned IE Codes." 
      });
    }

    if (user.role !== 'admin') {
      return res.status(400).json({ success: false, message: "User is not currently an admin." });
    }

    // Get the primary IE code for customer lookup
    const primaryIeCode = user.ie_code_assignments?.[0]?.ie_code_no || user.ie_code_no;
    
    const customer = await CustomerModel.findOne({ ie_code_no: primaryIeCode });
    if (!customer) {
      return res.status(400).json({ success: false, message: "No customer found with this IE code." });
    }

    // Update records
    user.role = 'user'; // Changed from 'customer' to 'user' to match schema
    await user.save();

    customer.role = 'customer';
    customer.roleGrantedBy = null;
    customer.roleGrantedAt = null;
    await customer.save();

    // Log activity
    await logActivity(
      actor.id,
      'USER_DEMOTED_FROM_ADMIN',
      `Demoted user ${user.name} from admin`,
      { 
        userId: user._id, 
        customerId: customer._id, 
        demotedBy: actor.id, 
        demoterRole: actor.role || 'superadmin',
        userIeCodeAssignments: user.ie_code_assignments
      },
      req.ip
    );

    res.json({
      success: true,
      message: "User demoted from admin successfully.",
      data: { user, customer }
    });

  } catch (error) {
    console.error("Demote user from admin error:", error);
    res.status(500).json({ success: false, message: "Failed to demote user from admin." });
  }
};

/**
 * Generic function to update a user's status (active/inactive).
 * Can be called by a SuperAdmin or an Admin.
 */
export const updateUserStatus = async (req, res) => {
  try {
    const actor = req.superAdmin || req.user;
    if (!actor) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { userId } = req.params;
    const { status, reason } = req.body; // Changed from isActive to status for consistency

    const user = await EximclientUser.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    
    // Security check using multiple IE codes
    if (!canManageUser(actor, user)) {
      return res.status(403).json({ 
        success: false, 
        message: "Forbidden: You can only manage users within your assigned IE Codes." 
      });
    }

    const isActive = status === 'active';

    // Update user status
    user.isActive = isActive;
    user.status = status;
    if (!isActive) {
      user.lastLogout = new Date();
    }
    await user.save();

    // Create notification
    await Notification.create({
      type: isActive ? 'user_activated' : 'user_deactivated',
      recipient: user._id,
      recipientModel: 'EximclientUser',
      sender: actor.id,
      senderModel: actor.role === 'superadmin' ? 'SuperAdmin' : 'Admin',
      title: `Account ${isActive ? 'Activated' : 'Deactivated'}`,
      message: `Your account has been ${isActive ? 'activated' : 'deactivated'}. ${reason ? 'Reason: ' + reason : ''}`,
    });

    // Log activity
    await logActivity(
      actor.id,
      'USER_STATUS_UPDATE',
      `${isActive ? 'Activated' : 'Deactivated'} user ${user.name}`,
      { 
        userId: user._id, 
        newStatus: status, 
        reason, 
        updatedBy: actor.id,
        userIeCodeAssignments: user.ie_code_assignments
      },
      req.ip
    );

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully.`,
    });

  } catch (error) {
    console.error("Update user status error:", error);
    res.status(500).json({ success: false, message: "Failed to update user status." });
  }
};

// ================== TAB VISIBILITY FUNCTIONS ==================

/**
 * Get tab visibility settings for a specific customer.
 * Can be called by SuperAdmin or Admin (within IE code restrictions).
 */
export const getCustomerTabVisibility = async (req, res) => {
  try {
    const actor = req.superAdmin || req.user;
    if (!actor) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { userId } = req.params;
    const user = await EximclientUser.findById(userId).select("jobsTabVisible gandhidhamTabVisible ie_code_assignments ie_code_no");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Security check using multiple IE codes
    if (!canManageUser(actor, user)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You can only view users within your assigned IE Codes."
      });
    }

    res.json({
      success: true,
      data: {
        jobsTabVisible: user.jobsTabVisible,
        gandhidhamTabVisible: user.gandhidhamTabVisible,
      }
    });
  } catch (error) {
    console.error("Error fetching customer tab visibility:", error);
    res.status(500).json({ success: false, message: "Error fetching customer tab visibility" });
  }
};

/**
 * Update tab visibility settings for a specific customer.
 * Can be called by SuperAdmin or Admin (within IE code restrictions).
 */
export const updateCustomerTabVisibility = async (req, res) => {
  try {
    const actor = req.superAdmin || req.user;
    if (!actor) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { userId } = req.params;
    const { jobsTabVisible, gandhidhamTabVisible } = req.body;

    const user = await EximclientUser.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Security check using multiple IE codes
    if (!canManageUser(actor, user)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You can only manage users within your assigned IE Codes."
      });
    }

    const previousSettings = {
      jobsTabVisible: user.jobsTabVisible,
      gandhidhamTabVisible: user.gandhidhamTabVisible
    };

    if (typeof jobsTabVisible === "boolean") {
      user.jobsTabVisible = jobsTabVisible;
    }
    if (typeof gandhidhamTabVisible === "boolean") {
      user.gandhidhamTabVisible = gandhidhamTabVisible;
    }

    await user.save();

    // Log activity
    await logActivity(
      actor.id,
      'USER_TAB_VISIBILITY_UPDATED',
      `Updated tab visibility for user ${user.name}`,
      { 
        userId: user._id,
        previousSettings,
        newSettings: {
          jobsTabVisible: user.jobsTabVisible,
          gandhidhamTabVisible: user.gandhidhamTabVisible
        },
        updatedBy: actor.id,
        userIeCodeAssignments: user.ie_code_assignments
      },
      req.ip
    );

    res.json({
      success: true,
      message: "User tab visibility updated successfully.",
      data: {
        jobsTabVisible: user.jobsTabVisible,
        gandhidhamTabVisible: user.gandhidhamTabVisible,
      }
    });
  } catch (error) {
    console.error("Error updating user tab visibility:", error);
    res.status(500).json({ success: false, message: "Error updating customer tab visibility" });
  }
};

// ================== COLUMN PERMISSIONS FUNCTIONS ==================

/**
 * Get all available columns in the system
 */
export const getAvailableColumns = async (req, res) => {
  try {
    // Define all available columns in the system
    const availableColumns = [
      { id: "supplier_exporter", name: "Exporter, Job Number & Free Time" },
      { id: "be_no", name: "BE Number & Date" },
      { id: "checklist", name: "Checklist" },
      { id: "shipment_details", name: "Shipment & Commercial Details" },
      { id: "container_details", name: "Container" },
      { id: "weight_shortage", name: "Weight Shortage/Excess" },
      { id: "movement_timeline", name: "Movement Timeline" },
      { id: "esanchit_documents", name: "eSanchit Documents" },
      { id: "doPlanning", name: "DO Planning" },
      { id: "delivery_planning", name: "Delivery Planning" }
    ];

    res.status(200).json({
      success: true,
      data: availableColumns
    });
  } catch (error) {
    console.error("Error fetching available columns:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch available columns",
      error: error.message,
    });
  }
};

/**
 * Get column permissions for a specific user
 * Can be called by SuperAdmin or Admin (within IE code restrictions)
 */
export const getUserColumnPermissions = async (req, res) => {
  try {
    const actor = req.superAdmin || req.user;
    if (!actor) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { userId } = req.params;
    const user = await EximclientUser.findById(userId).select('name email ie_code_assignments ie_code_no allowedColumns role');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Security check using multiple IE codes
    if (!canManageUser(actor, user)) {
      return res.status(403).json({ 
        success: false, 
        message: "Forbidden: You can only manage users within your assigned IE Codes." 
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          ie_code_assignments: user.ie_code_assignments,
          ie_code_no: user.ie_code_no, // Legacy field
          role: user.role,
          allowedColumns: user.allowedColumns || []
        }
      },
    });

  } catch (error) {
    console.error("Error fetching user column permissions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user column permissions",
      error: error.message,
    });
  }
};

/**
 * Update column permissions for a specific user
 * Can be called by SuperAdmin or Admin (within IE code restrictions)
 */
export const updateUserColumnPermissions = async (req, res) => {
  try {
    const actor = req.superAdmin || req.user;
    if (!actor) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { userId } = req.params;
    const { allowedColumns } = req.body;

    if (!Array.isArray(allowedColumns)) {
      return res.status(400).json({
        success: false,
        message: "allowedColumns must be an array",
      });
    }

    const user = await EximclientUser.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Security check using multiple IE codes
    if (!canManageUser(actor, user)) {
      return res.status(403).json({ 
        success: false, 
        message: "Forbidden: You can only manage users within your assigned IE Codes." 
      });
    }

    // Store previous permissions for logging
    const previousColumns = user.allowedColumns || [];

    // Update user permissions
    user.allowedColumns = allowedColumns;
    await user.save();

    // Log activity
    await logActivity(
      actor.id,
      'USER_COLUMN_PERMISSIONS_UPDATED',
      `Updated column permissions for user ${user.name}`,
      { 
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        previousColumns,
        newColumns: allowedColumns,
        updatedBy: actor.id,
        updaterRole: actor.role || 'superadmin',
        userIeCodeAssignments: user.ie_code_assignments
      },
      req.ip
    );

    console.log(`Column permissions updated for user ${user.name} by ${actor.role || 'superadmin'}`);

    res.status(200).json({
      success: true,
      message: "User column permissions updated successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        ie_code_assignments: user.ie_code_assignments,
        allowedColumns: user.allowedColumns
      },
    });

  } catch (error) {
    console.error("Error updating user column permissions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user column permissions",
      error: error.message,
    });
  }
};

/**
 * Get column permissions for a specific customer (for backward compatibility)
 */
export const getCustomerColumnPermissions = async (req, res) => {
  try {
    const actor = req.superAdmin || req.user;
    if (!actor) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { customerId } = req.params;
    const customer = await CustomerModel.findById(customerId).select('name ie_code_no allowedColumns');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Security check for customers (simplified - single IE code check)
    if (actor.role === 'admin') {
      const actorIeCodes = actor.ie_code_assignments?.map(a => a.ie_code_no) || [actor.ie_code_no];
      if (!actorIeCodes.includes(customer.ie_code_no)) {
        return res.status(403).json({ 
          success: false, 
          message: "Forbidden: You can only manage customers within your assigned IE Codes." 
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        customer: {
          id: customer._id,
          name: customer.name,
          ie_code_no: customer.ie_code_no,
          allowedColumns: customer.allowedColumns || []
        }
      },
    });

  } catch (error) {
    console.error("Error fetching customer column permissions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer column permissions",
      error: error.message,
    });
  }
};

/**
 * Update column permissions for a specific customer (for backward compatibility)
 */
export const updateCustomerColumnPermissions = async (req, res) => {
  try {
    const actor = req.superAdmin || req.user;
    if (!actor) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { customerId } = req.params;
    const { allowedColumns } = req.body;

    if (!Array.isArray(allowedColumns)) {
      return res.status(400).json({
        success: false,
        message: "allowedColumns must be an array",
      });
    }

    const customer = await CustomerModel.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Security check for customers (simplified - single IE code check)
    if (actor.role === 'admin') {
      const actorIeCodes = actor.ie_code_assignments?.map(a => a.ie_code_no) || [actor.ie_code_no];
      if (!actorIeCodes.includes(customer.ie_code_no)) {
        return res.status(403).json({ 
          success: false, 
          message: "Forbidden: You can only manage customers within your assigned IE Codes." 
        });
      }
    }

    // Store previous permissions for logging
    const previousColumns = customer.allowedColumns || [];

    // Update customer permissions
    customer.allowedColumns = allowedColumns;
    await customer.save();

    // Log activity
    await logActivity(
      actor.id,
      'CUSTOMER_COLUMN_PERMISSIONS_UPDATED',
      `Updated column permissions for customer ${customer.name}`,
      { 
        customerId: customer._id, 
        customerName: customer.name,
        ie_code_no: customer.ie_code_no,
        previousColumns,
        newColumns: allowedColumns,
        updatedBy: actor.id,
        updaterRole: actor.role || 'superadmin'
      },
      req.ip
    );

    console.log(`Column permissions updated for customer ${customer.name} (${customer.ie_code_no}) by ${actor.role || 'superadmin'}`);

    res.status(200).json({
      success: true,
      message: "Customer column permissions updated successfully",
      data: {
        id: customer._id,
        name: customer.name,
        ie_code_no: customer.ie_code_no,
        allowedColumns: customer.allowedColumns
      },
    });

  } catch (error) {
    console.error("Error updating customer column permissions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update customer column permissions",
      error: error.message,
    });
  }
};

/**
 * Bulk update column permissions for multiple users
 * Can be called by SuperAdmin or Admin (within IE code restrictions)
 */
export const bulkUpdateUserColumnPermissions = async (req, res) => {
  try {
    const actor = req.superAdmin || req.user;
    if (!actor) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { userIds, allowedColumns } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "userIds must be a non-empty array",
      });
    }

    if (!Array.isArray(allowedColumns)) {
      return res.status(400).json({
        success: false,
        message: "allowedColumns must be an array",
      });
    }

    // Build query with IE code restrictions for admins
    let query = { _id: { $in: userIds } };
    
    if (actor.role === 'admin') {
      const actorIeCodes = actor.ie_code_assignments?.map(a => a.ie_code_no) || [actor.ie_code_no];
      query.$or = [
        { 'ie_code_assignments.ie_code_no': { $in: actorIeCodes } },
        { ie_code_no: { $in: actorIeCodes } } // Legacy field support
      ];
    }

    const result = await EximclientUser.updateMany(
      query,
      { allowedColumns }
    );

    // Log activity
    await logActivity(
      actor.id,
      'BULK_USER_COLUMN_PERMISSIONS_UPDATED',
      `Bulk updated column permissions for ${result.modifiedCount} users`,
      { 
        userIds,
        allowedColumns,
        modifiedCount: result.modifiedCount,
        updatedBy: actor.id,
        updaterRole: actor.role || 'superadmin',
        ieCodeRestriction: actor.role === 'admin' ? (actor.ie_code_assignments?.map(a => a.ie_code_no) || [actor.ie_code_no]) : null
      },
      req.ip
    );

    console.log(`Bulk column permissions updated for ${result.modifiedCount} users by ${actor.role || 'superadmin'}`);

    res.status(200).json({
      success: true,
      message: `Column permissions updated for ${result.modifiedCount} users`,
      data: {
        modifiedCount: result.modifiedCount,
        allowedColumns
      },
    });

  } catch (error) {
    console.error("Error in bulk user column permissions update:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update column permissions",
      error: error.message,
    });
  }
};

/**
 * Bulk update column permissions for multiple customers (for backward compatibility)
 */
export const bulkUpdateCustomerColumnPermissions = async (req, res) => {
  try {
    const actor = req.superAdmin || req.user;
    if (!actor) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { customerIds, allowedColumns } = req.body;

    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "customerIds must be a non-empty array",
      });
    }

    if (!Array.isArray(allowedColumns)) {
      return res.status(400).json({
        success: false,
        message: "allowedColumns must be an array",
      });
    }

    // Security Check for Admins - can only update customers within their IE Codes
    let query = { _id: { $in: customerIds } };
    if (actor.role === 'admin') {
      const actorIeCodes = actor.ie_code_assignments?.map(a => a.ie_code_no) || [actor.ie_code_no];
      query.ie_code_no = { $in: actorIeCodes };
    }

    const result = await CustomerModel.updateMany(
      query,
      { allowedColumns }
    );

    // Log activity
    await logActivity(
      actor.id,
      'BULK_CUSTOMER_COLUMN_PERMISSIONS_UPDATED',
      `Bulk updated column permissions for ${result.modifiedCount} customers`,
      { 
        customerIds,
        allowedColumns,
        modifiedCount: result.modifiedCount,
        updatedBy: actor.id,
        updaterRole: actor.role || 'superadmin',
        ieCodeRestriction: actor.role === 'admin' ? (actor.ie_code_assignments?.map(a => a.ie_code_no) || [actor.ie_code_no]) : null
      },
      req.ip
    );

    console.log(`Bulk column permissions updated for ${result.modifiedCount} customers by ${actor.role || 'superadmin'}`);

    res.status(200).json({
      success: true,
      message: `Column permissions updated for ${result.modifiedCount} customers`,
      data: {
        modifiedCount: result.modifiedCount,
        allowedColumns
      },
    });

  } catch (error) {
    console.error("Error in bulk customer column permissions update:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update column permissions",
      error: error.message,
    });
  }
};
