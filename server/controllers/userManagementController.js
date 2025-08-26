import EximclientUser from "../models/eximclientUserModel.js";
import { logActivity } from "../utils/activityLogger.js";
import mongoose from "mongoose";

/**
 * Get all users under an IECode
 */
export const getUsersByIECode = async (req, res) => {
  try {
    const { ie_code_no } = req.query;
    const requestingUser = req.user;

    // Validate ie_code_no parameter
    if (!ie_code_no) {
      return res.status(400).json({
        success: false,
        message: "IE Code is required"
      });
    }

    // Super admin can view any IECode's users
    if (requestingUser.role !== 'superadmin' && requestingUser.ie_code_no !== ie_code_no) {
      return res.status(403).json({
        success: false,
        message: "You can only view users under your IE Code"
      });
    }

    // Build query properly - avoid nested operators
    const query = { 
      ie_code_no: ie_code_no.toUpperCase().trim()
    };

    const users = await EximclientUser.find(query)
      .select('-password -emailVerificationToken -initialPassword')
      .lean(); // Use lean() for better performance

    res.status(200).json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    console.error("Get users by IE Code error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create/Invite a new user under an IECode
 */
export const inviteUser = async (req, res) => {
  try {
    const { name, email, ie_code_no, importer } = req.body;
    const requestingUser = req.user;

    // Validate required fields
    if (!name || !email || !ie_code_no) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and IE Code are required"
      });
    }

    // Validate permissions
    if (requestingUser.role !== 'superadmin' && 
        (requestingUser.role !== 'admin' || requestingUser.ie_code_no !== ie_code_no)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to invite users for this IE Code"
      });
    }

    // Check if user already exists
    const existingUser = await EximclientUser.findOne({ 
      email: email.toLowerCase().trim() 
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists"
      });
    }

    // Create user with temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
    
    const user = new EximclientUser({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: tempPassword,
      initialPassword: tempPassword,
      ie_code_no: ie_code_no.toUpperCase().trim(),
      importer: importer?.trim(),
      role: 'customer',
      isActive: false,
      password_changed: false
    });

    await user.save();

    // Log activity with proper structure
    await logActivity(
      requestingUser._id,
      'USER_INVITED',
      `Invited user ${email} to IE Code ${ie_code_no}`,
      {
        invitedUserEmail: email,
        invitedUserName: name,
        ie_code_no: ie_code_no,
        importer: importer
      },
      req.ip
    );

    res.status(201).json({
      success: true,
      message: "User invited successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        ie_code_no: user.ie_code_no,
        role: user.role,
        tempPassword: tempPassword // In production, send via email instead
      }
    });
  } catch (error) {
    console.error("Invite user error:", error);
    res.status(500).json({
      success: false,
      message: "Error inviting user",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update user role (promote/demote)
 */
export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newRole } = req.body;
    const requestingUser = req.user;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    // Validate role
    const validRoles = ['customer', 'admin'];
    if (!validRoles.includes(newRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be 'customer' or 'admin'"
      });
    }

    const targetUser = await EximclientUser.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Only super_admin or admin of same IE code can modify roles
    if (requestingUser.role !== 'superadmin' && 
        (requestingUser.role !== 'admin' || requestingUser.ie_code_no !== targetUser.ie_code_no)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to modify user roles"
      });
    }

    // Prevent demoting the last admin
    if (targetUser.role === 'admin' && newRole === 'customer') {
      const adminCount = await EximclientUser.countDocuments({
        ie_code_no: targetUser.ie_code_no,
        role: 'admin'
      });

      if (adminCount <= 1 && requestingUser.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          message: "Cannot demote the last admin. Only super admin can perform this action."
        });
      }
    }

    const previousRole = targetUser.role;
    targetUser.role = newRole;
    await targetUser.save();

    await logActivity(
      requestingUser._id,
      'USER_ROLE_UPDATED',
      `Updated user ${targetUser.email} role from ${previousRole} to ${newRole}`,
      {
        targetUserId: targetUser._id,
        targetUserEmail: targetUser.email,
        previousRole,
        newRole,
        ie_code_no: targetUser.ie_code_no
      },
      req.ip
    );

    res.status(200).json({
      success: true,
      message: "User role updated successfully",
      data: {
        userId: targetUser._id,
        email: targetUser.email,
        previousRole,
        newRole
      }
    });
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating user role",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update user status (activate/deactivate)
 */
export const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;
    const requestingUser = req.user;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    // Validate status
    const validStatuses = ['active', 'inactive', 'pending', 'suspended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'active', 'inactive', 'pending', or 'suspended'"
      });
    }

    const targetUser = await EximclientUser.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Check permissions
    if (requestingUser.role !== 'superadmin' && 
        (requestingUser.role !== 'admin' || requestingUser.ie_code_no !== targetUser.ie_code_no)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to modify user status"
      });
    }

    const previousStatus = targetUser.status;
    const previousIsActive = targetUser.isActive;

    targetUser.isActive = status === 'active';
    
    // Update last login/logout based on status change
    if (status === 'inactive' || status === 'suspended') {
      targetUser.lastLogout = new Date();
    }

    await targetUser.save();

    await logActivity(
      requestingUser._id,
      'USER_STATUS_UPDATED',
      `Updated user ${targetUser.email} status from ${previousIsActive ? 'active' : 'inactive'} to ${status}`,
      {
        targetUserId: targetUser._id,
        targetUserEmail: targetUser.email,
        previousStatus: previousIsActive ? 'active' : 'inactive',
        newStatus: status,
        ie_code_no: targetUser.ie_code_no
      },
      req.ip
    );

    res.status(200).json({
      success: true,
      message: "User status updated successfully",
      data: {
        userId: targetUser._id,
        email: targetUser.email,
        isActive: targetUser.isActive,
        status: status
      }
    });
  } catch (error) {
    console.error("Update user status error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating user status",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update user's import DSR column permissions
 */
export const updateColumnPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { allowedColumns } = req.body;
    const requestingUser = req.user;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    // Validate allowedColumns
    if (!Array.isArray(allowedColumns)) {
      return res.status(400).json({
        success: false,
        message: "allowedColumns must be an array"
      });
    }

    const targetUser = await EximclientUser.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Check permissions
    if (requestingUser.role !== 'superadmin'||
        (requestingUser.role !== 'admin' || requestingUser.ie_code_no !== targetUser.ie_code_no)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to modify column permissions"
      });
    }

    // Check if user has import DSR module assigned
    if (!targetUser.assignedModules.includes('import_dsr')) {
      return res.status(403).json({
        success: false,
        message: "User does not have Import DSR module assigned"
      });
    }

    const previousColumns = targetUser.allowedColumns || [];
    targetUser.allowedColumns = allowedColumns;
    await targetUser.save();

    await logActivity(
      requestingUser._id,
      'COLUMN_PERMISSIONS_UPDATED',
      `Updated column permissions for user ${targetUser.email}`,
      {
        targetUserId: targetUser._id,
        targetUserEmail: targetUser.email,
        previousColumns,
        newColumns: allowedColumns,
        ie_code_no: targetUser.ie_code_no
      },
      req.ip
    );

    res.status(200).json({
      success: true,
      message: "Column permissions updated successfully",
      data: {
        userId: targetUser._id,
        email: targetUser.email,
        allowedColumns: targetUser.allowedColumns
      }
    });
  } catch (error) {
    console.error("Update column permissions error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating column permissions",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get exporters for a specific importer (for the aggregation error you're seeing)
 */
export const getExportersByImporter = async (req, res) => {
  try {
    const { importer } = req.query;
    const requestingUser = req.user;

    if (!importer) {
      return res.status(400).json({
        success: false,
        message: "Importer name is required"
      });
    }

    // Build aggregation pipeline correctly to avoid "cannot nest $ under $in" error
    const pipeline = [
      {
        $match: {
          importer: {
            $regex: `^${importer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, // Escape special regex characters
            $options: "i"
          },
          supplier_exporter: {
            $exists: true,
            $ne: "",
            $ne: null
          }
        }
      },
      {
        $group: {
          _id: "$supplier_exporter",
          count: { $sum: 1 },
          firstSeen: { $min: "$date" },
          lastSeen: { $max: "$date" }
        }
      },
      {
        $project: {
          _id: 0,
          exporter: "$_id",
          count: 1,
          firstSeen: 1,
          lastSeen: 1
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 100 // Limit results for performance
      }
    ];

    // Use the correct collection name for your jobs/shipment data
    const JobModel = mongoose.model('Job'); // Adjust this to your actual model
    const exporters = await JobModel.aggregate(pipeline);

    res.status(200).json({
      success: true,
      data: exporters,
      count: exporters.length
    });

  } catch (error) {
    console.error("Get exporters error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching exporters",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};



/**
 * Save or update the column order for the logged-in user.
 */
export const postColumnOrder = async (req, res) => {
  try {
    const { columnOrder } = req.body;
    const userId = req.user._id; // Get user ID from the authenticated session

    if (!columnOrder || !Array.isArray(columnOrder)) {
      return res.status(400).json({ 
        success: false, 
        message: "A valid 'columnOrder' array is required." 
      });
    }

    // Find the user and update their columnOrder
    await EximclientUser.findByIdAndUpdate(userId, { columnOrder });

    res.json({ 
      success: true, 
      message: "Column order saved successfully." 
    });
  } catch (err) {
    console.error("Error saving column order:", err);
    res.status(500).json({ success: false, message: "Server error while saving column order." });
  }
};

/**
 * Get the column order and permissions for the logged-in user.
 */
export const getColumnOrder = async (req, res) => {
  try {
    const userId = req.user._id; // Get user ID from the authenticated session

    const user = await EximclientUser.findById(userId).select('columnOrder allowedColumns name ie_code_no').lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please try logging in again.",
      });
    }
   
    res.json({
      success: true,
      columnOrder: user.columnOrder || [],
      allowedColumns: user.allowedColumns || [], // Also send their allowed columns
      userInfo: {
        id: user._id,
        name: user.name,
        ie_code_no: user.ie_code_no
      }
    });
  } catch (err) {
    console.error("Error fetching column order:", err);
    res.status(500).json({ success: false, message: "Server error while fetching column order." });
  }
};