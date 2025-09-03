import EximclientUser from "../models/eximclientUserModel.js";
import { logActivity } from "../utils/activityLogger.js";
import mongoose from "mongoose";

/**
 * Get all users under an IECode
 */
export const getUsersByIECode = async (req, res) => {
  try {
    const { ie_code_nos, importer, page = 1, limit = 50 } = req.query;
    const requestingUser = req.user;

    // Parse IE codes - support both single and multiple
    let ieCodeArray = [];
    if (ie_code_nos) {
      ieCodeArray = ie_code_nos.split(',').map(code => code.trim().toUpperCase()).filter(code => code);
    } else {
      // Fallback to user's assigned IE codes
      ieCodeArray = requestingUser.ie_code_assignments?.map(a => a.ie_code_no) || [];
    }

    if (ieCodeArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: "IE Code(s) are required"
      });
    }

    // Super admin can view any IE codes' users
    if (requestingUser.role !== 'superadmin') {
      const userIeCodes = requestingUser.ie_code_assignments?.map(a => a.ie_code_no) || [];
      const hasAccess = ieCodeArray.every(code => userIeCodes.includes(code));
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "You can only view users under your assigned IE Codes"
        });
      }
    }

    // Build base query - only use ie_code_assignments (no legacy support)
    let query = {
      'ie_code_assignments.ie_code_no': { $in: ieCodeArray }
    };

    // Add importer filter if provided
    if (importer && importer !== "All Importers") {
      query['ie_code_assignments'] = {
        $elemMatch: {
          ie_code_no: { $in: ieCodeArray },
          importer_name: { $regex: new RegExp(importer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
        }
      };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get total count for pagination
    const totalCount = await EximclientUser.countDocuments(query);

    // Get paginated users
    const users = await EximclientUser.find(query)
      .select('-password -emailVerificationToken -passwordResetToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get unique importers for filtering dropdown (only from ie_code_assignments)
    const importerAggregation = await EximclientUser.aggregate([
      { 
        $match: { 
          'ie_code_assignments.ie_code_no': { $in: ieCodeArray }
        } 
      },
      { $unwind: '$ie_code_assignments' },
      {
        $match: {
          'ie_code_assignments.ie_code_no': { $in: ieCodeArray }
        }
      },
      {
        $group: {
          _id: '$ie_code_assignments.importer_name',
          count: { $sum: 1 }
        }
      },
      {
        $match: { 
          _id: { $ne: null, $ne: '' }
        }
      },
      {
        $project: {
          _id: 0,
          importer_name: '$_id',
          count: 1
        }
      },
      { $sort: { count: -1 } }
    ]);

    const availableImporters = importerAggregation.map(imp => imp.importer_name);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total_count: totalCount,
        total_pages: Math.ceil(totalCount / parseInt(limit)),
        has_next: parseInt(page) < Math.ceil(totalCount / parseInt(limit)),
        has_previous: parseInt(page) > 1
      },
      filters: {
        ie_codes_searched: ieCodeArray,
        importer_filter: importer || null,
        available_importers: availableImporters
      }
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
 * Get available importers for a set of IE codes (only from ie_code_assignments)
 */
export const getAvailableImporters = async (req, res) => {
  try {
    const { ie_code_nos } = req.query;
    const requestingUser = req.user;

    // Parse IE codes
    let ieCodeArray = [];
    if (ie_code_nos) {
      ieCodeArray = ie_code_nos.split(',').map(code => code.trim().toUpperCase()).filter(code => code);
    } else {
      ieCodeArray = requestingUser.ie_code_assignments?.map(a => a.ie_code_no) || [];
    }

    if (ieCodeArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: "IE Code(s) are required"
      });
    }

    // Check permissions
    if (requestingUser.role !== 'superadmin') {
      const userIeCodes = requestingUser.ie_code_assignments?.map(a => a.ie_code_no) || [];
      const hasAccess = ieCodeArray.every(code => userIeCodes.includes(code));
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "You can only view importers for your assigned IE Codes"
        });
      }
    }

    // Aggregate unique importers for the specified IE codes (only from ie_code_assignments)
    const importerAggregation = await EximclientUser.aggregate([
      {
        $match: {
          'ie_code_assignments': { $exists: true, $ne: [] }
        }
      },
      { $unwind: '$ie_code_assignments' },
      {
        $match: {
          'ie_code_assignments.ie_code_no': { $in: ieCodeArray }
        }
      },
      {
        $group: {
          _id: '$ie_code_assignments.importer_name',
          count: { $sum: 1 },
          ie_codes: { $addToSet: '$ie_code_assignments.ie_code_no' }
        }
      },
      {
        $match: { 
          _id: { $ne: null, $ne: '' }
        }
      },
      {
        $project: {
          _id: 0,
          importer_name: '$_id',
          user_count: '$count',
          ie_codes: 1
        }
      },
      { $sort: { user_count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: importerAggregation,
      count: importerAggregation.length,
      ie_codes_searched: ieCodeArray
    });
  } catch (error) {
    console.error("Get available importers error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching available importers",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user statistics by importer and IE code (only from ie_code_assignments)
 */
export const getUserStatsByImporter = async (req, res) => {
  try {
    const { ie_code_nos } = req.query;
    const requestingUser = req.user;

    // Parse IE codes
    let ieCodeArray = [];
    if (ie_code_nos) {
      ieCodeArray = ie_code_nos.split(',').map(code => code.trim().toUpperCase()).filter(code => code);
    } else {
      ieCodeArray = requestingUser.ie_code_assignments?.map(a => a.ie_code_no) || [];
    }

    if (ieCodeArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: "IE Code(s) are required"
      });
    }

    // Check permissions
    if (requestingUser.role !== 'superadmin') {
      const userIeCodes = requestingUser.ie_code_assignments?.map(a => a.ie_code_no) || [];
      const hasAccess = ieCodeArray.every(code => userIeCodes.includes(code));
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "You can only view statistics for your assigned IE Codes"
        });
      }
    }

    // Get detailed statistics (only from ie_code_assignments)
    const stats = await EximclientUser.aggregate([
      {
        $match: {
          'ie_code_assignments': { $exists: true, $ne: [] }
        }
      },
      { $unwind: '$ie_code_assignments' },
      {
        $match: {
          'ie_code_assignments.ie_code_no': { $in: ieCodeArray }
        }
      },
      {
        $group: {
          _id: {
            ie_code: '$ie_code_assignments.ie_code_no',
            importer: '$ie_code_assignments.importer_name',
            status: '$status',
            role: '$role'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: {
            ie_code: '$_id.ie_code',
            importer: '$_id.importer'
          },
          total_users: { $sum: '$count' },
          status_breakdown: {
            $push: {
              status: '$_id.status',
              role: '$_id.role',
              count: '$count'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          ie_code: '$_id.ie_code',
          importer_name: '$_id.importer',
          total_users: 1,
          status_breakdown: 1
        }
      },
      { $sort: { ie_code: 1, total_users: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: stats,
      ie_codes_searched: ieCodeArray,
      summary: {
        total_ie_codes: [...new Set(stats.map(s => s.ie_code))].length,
        total_importers: [...new Set(stats.map(s => s.importer_name))].filter(Boolean).length,
        total_users: stats.reduce((sum, s) => sum + s.total_users, 0)
      }
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user statistics",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create/Invite a new user under an IECode
 */
export const inviteUser = async (req, res) => {
  try {
    const { name, email, ie_code_assignments, ie_code_no, importer } = req.body; // Support both new and old format
    const requestingUser = req.user;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required"
      });
    }

    // Handle IE code assignments - support both new and legacy formats
    let assignments = [];
    if (ie_code_assignments && Array.isArray(ie_code_assignments)) {
      assignments = ie_code_assignments;
    } else if (ie_code_no) {
      // Legacy support
      assignments = [{
        ie_code_no: ie_code_no.toUpperCase().trim(),
        importer_name: importer?.trim() || 'Unknown',
        assigned_by: requestingUser._id,
        assigned_by_model: requestingUser.role === 'superadmin' ? 'SuperAdmin' : 'Admin',
        assigned_at: new Date()
      }];
    }

    if (assignments.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one IE code assignment is required"
      });
    }

    // Validate permissions for each IE code
    if (requestingUser.role !== 'superadmin') {
      const userIeCodes = requestingUser.ie_code_assignments?.map(a => a.ie_code_no) || [];
      const requestedIeCodes = assignments.map(a => a.ie_code_no);
      const hasAccess = requestedIeCodes.every(code => userIeCodes.includes(code));
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to invite users for some of these IE Codes"
        });
      }
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
      ie_code_assignments: assignments.map(a => ({
        ...a,
        assigned_by: requestingUser._id,
        assigned_by_model: requestingUser.role === 'superadmin' ? 'SuperAdmin' : 'Admin'
      })),
      // Keep legacy fields for backward compatibility
      ie_code_no: assignments[0]?.ie_code_no,
      assignedImporterName: assignments[0]?.importer_name,
      role: 'user', // Changed from 'customer' to match schema
      isActive: false,
      password_changed: false
    });

    await user.save();

    // Log activity
    await logActivity(
      requestingUser._id,
      'USER_INVITED',
      `Invited user ${email} with IE Code assignments: ${assignments.map(a => a.ie_code_no).join(', ')}`,
      {
        invitedUserEmail: email,
        invitedUserName: name,
        ie_code_assignments: assignments
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
        ie_code_assignments: user.ie_code_assignments,
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
 * Update user role (promote/demote) - supports multiple IE codes
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
    const validRoles = ['user', 'admin']; // Updated to match schema
    if (!validRoles.includes(newRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be 'user' or 'admin'"
      });
    }

    const targetUser = await EximclientUser.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Check permissions based on IE code assignments
    if (requestingUser.role !== 'superadmin') {
      const userIeCodes = requestingUser.ie_code_assignments?.map(a => a.ie_code_no) || [];
      const targetIeCodes = targetUser.ie_code_assignments?.map(a => a.ie_code_no) || [targetUser.ie_code_no];
      const hasAccess = targetIeCodes.some(code => userIeCodes.includes(code));
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to modify this user's role"
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
        ie_code_assignments: targetUser.ie_code_assignments
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
    const validStatuses = ['active', 'inactive', 'pending'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'active', 'inactive', or 'pending'"
      });
    }

    const targetUser = await EximclientUser.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Check permissions based on IE code assignments
    if (requestingUser.role !== 'superadmin') {
      const userIeCodes = requestingUser.ie_code_assignments?.map(a => a.ie_code_no) || [];
      const targetIeCodes = targetUser.ie_code_assignments?.map(a => a.ie_code_no) || [targetUser.ie_code_no];
      const hasAccess = targetIeCodes.some(code => userIeCodes.includes(code));
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to modify this user's status"
        });
      }
    }

    const previousStatus = targetUser.status;
    const previousIsActive = targetUser.isActive;

    targetUser.status = status;
    targetUser.isActive = status === 'active';
    
    if (status === 'inactive') {
      targetUser.lastLogout = new Date();
    }

    await targetUser.save();

    await logActivity(
      requestingUser._id,
      'USER_STATUS_UPDATED',
      `Updated user ${targetUser.email} status from ${previousStatus} to ${status}`,
      {
        targetUserId: targetUser._id,
        targetUserEmail: targetUser.email,
        previousStatus,
        newStatus: status,
        ie_code_assignments: targetUser.ie_code_assignments
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

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

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

    // Check permissions based on IE code assignments
    if (requestingUser.role !== 'superadmin') {
      const userIeCodes = requestingUser.ie_code_assignments?.map(a => a.ie_code_no) || [];
      const targetIeCodes = targetUser.ie_code_assignments?.map(a => a.ie_code_no) || [targetUser.ie_code_no];
      const hasAccess = targetIeCodes.some(code => userIeCodes.includes(code));
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to modify this user's column permissions"
        });
      }
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
        ie_code_assignments: targetUser.ie_code_assignments
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