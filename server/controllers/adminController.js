import AdminModel from "../models/adminModel.js";
import EximclientUser from "../models/eximclientUserModel.js";
import CustomerModel from "../models/customerModel.js";
import ModuleAccess from "../models/moduleAccessModel.js";
import Notification from "../models/notificationModel.js";
import { sendUserAuthResponse } from "../middlewares/authMiddleware.js";
import { logActivity } from "../utils/activityLogger.js";

/**
 * Admin Login
 */
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    // Find admin by email
    const admin = await AdminModel.findOne({ 
      email: email.toLowerCase(),
      isActive: true 
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    // Check if account is locked
    if (admin.isLocked) {
      return res.status(423).json({
        success: false,
        message: "Account is temporarily locked due to multiple failed login attempts."
      });
    }

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      await admin.incLoginAttempts();
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    // Reset login attempts and update last login
    if (admin.loginAttempts > 0) {
      await admin.resetLoginAttempts();
    }
    
    admin.lastLogin = new Date();
    admin.lastActivity = new Date();
    await admin.save();

    // Log activity


    // Send auth response
    sendUserAuthResponse(admin, 'admin', 200, res);

  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed. Please try again later."
    });
  }
};

/**
 * Get Admin Dashboard
 */
export const getAdminDashboard = async (req, res) => {
  try {
    const admin = req.user;

    // Get users under this admin's IE code
    const users = await EximclientUser.find({ ie_code_no: admin.ie_code_no })
      .select('-password')
      .sort({ createdAt: -1 });

    // Get pending users count
    const pendingUsersCount = await EximclientUser.countDocuments({ 
      ie_code_no: admin.ie_code_no,
      status: 'pending' 
    });

    // Get active users count
    const activeUsersCount = await EximclientUser.countDocuments({ 
      ie_code_no: admin.ie_code_no,
      status: 'active' 
    });

    // Get recent notifications
    const notifications = await Notification.find({
      recipient: admin._id,
      recipientModel: 'Admin',
      isRead: false
    }).sort({ createdAt: -1 }).limit(10);

    // Get module access stats
    const moduleAccessStats = await ModuleAccess.aggregate([
      { $match: { ie_code_no: admin.ie_code_no } },
      { 
        $group: {
          _id: '$moduleKey',
          moduleName: { $first: '$moduleName' },
          enabledCount: { 
            $sum: { $cond: ['$isEnabled', 1, 0] } 
          },
          totalCount: { $sum: 1 }
        }
      }
    ]);

    const dashboardData = {
      admin: {
        name: admin.name,
        email: admin.email,
        ie_code_no: admin.ie_code_no,
        lastLogin: admin.lastLogin
      },
      statistics: {
        totalUsers: users.length,
        pendingUsers: pendingUsersCount,
        activeUsers: activeUsersCount,
        inactiveUsers: users.length - activeUsersCount,
        moduleAccessRequests: moduleAccessStats.reduce((sum, stat) => sum + stat.totalCount, 0)
      },
      recentUsers: users.slice(0, 5),
      notifications,
      moduleAccessStats
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error("Get admin dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data."
    });
  }
};

/**
 * Get Users for Admin
 */
export const getUsers = async (req, res) => {
  try {
    const admin = req.user;
    const { status, page = 1, limit = 10, search } = req.query;

    // Build query
    const query = { ie_code_no: admin.ie_code_no };
    
    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Get users with pagination
    const users = await EximclientUser.find(query)
      .select('-password')
      .populate('adminId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await EximclientUser.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users."
    });
  }
};

/**
 * Update User Status
 */
export const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;
    const admin = req.user;

    // Validate status
    if (!['pending', 'active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be pending, active, or inactive."
      });
    }

    // Find user
    const user = await EximclientUser.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    // Check if admin has permission to manage this user
    if (user.ie_code_no !== admin.ie_code_no) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to manage this user."
      });
    }

    // Update user status
    const oldStatus = user.status;
    user.status = status;
    user.isActive = status === 'active';
    
    if (status === 'active' && oldStatus === 'pending') {
      user.verificationDate = new Date();
      user.verifiedBy = admin._id;
    }

    await user.save();

    // Create notification for user
    let notificationMessage = '';
    let notificationType = '';
    
    switch (status) {
      case 'active':
        notificationMessage = `Your account has been activated by ${admin.name}. You can now access assigned modules.`;
        notificationType = 'user_activated';
        break;
      case 'inactive':
        notificationMessage = `Your account has been deactivated by ${admin.name}. ${reason ? 'Reason: ' + reason : ''}`;
        notificationType = 'user_deactivated';
        break;
      case 'pending':
        notificationMessage = `Your account status has been changed to pending verification.`;
        notificationType = 'user_verification_pending';
        break;
    }

    await Notification.createNotification({
      type: notificationType,
      recipient: user._id,
      recipientModel: 'EximclientUser',
      sender: admin._id,
      senderModel: 'Admin',
      title: 'Account Status Updated',
      message: notificationMessage,
      data: {
        oldStatus,
        newStatus: status,
        reason: reason || null,
        adminName: admin.name
      },
      priority: status === 'inactive' ? 'high' : 'medium'
    });

    // Log activity
  

    res.json({
      success: true,
      message: `User status updated to ${status} successfully.`,
      data: {
        userId: user._id,
        oldStatus,
        newStatus: status,
        updatedAt: new Date()
      }
    });

  } catch (error) {
    console.error("Update user status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user status."
    });
  }
};

/**
 * Manage Module Access
 */
export const manageModuleAccess = async (req, res) => {
  try {
    const { userId } = req.params;
    const { moduleKey, isEnabled, permissions } = req.body;
    const admin = req.user;

    // Find user
    const user = await EximclientUser.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    // Check if admin has permission
    if (user.ie_code_no !== admin.ie_code_no) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to manage this user's modules."
      });
    }

    // Find or create module access
    let moduleAccess = await ModuleAccess.findOne({
      userId: userId,
      moduleKey: moduleKey
    });

    if (!moduleAccess) {
      // Get module info (this should be from a modules service/config)
      const availableModules = getAvailableModules();
      const module = availableModules.find(m => m.key === moduleKey);
      
      if (!module) {
        return res.status(404).json({
          success: false,
          message: "Invalid module key."
        });
      }

      moduleAccess = new ModuleAccess({
        userId: userId,
        ie_code_no: user.ie_code_no,
        moduleName: module.name,
        moduleKey: moduleKey,
        isEnabled: false
      });
    }

    // Update module access
    const wasEnabled = moduleAccess.isEnabled;
    moduleAccess.isEnabled = isEnabled;
    
    if (isEnabled && !wasEnabled) {
      moduleAccess.enabledBy = admin._id;
      moduleAccess.enabledAt = new Date();
    }

    if (permissions) {
      moduleAccess.permissions = {
        ...moduleAccess.permissions,
        ...permissions
      };
    }

    await moduleAccess.save();

    // Create notification for user
    const action = isEnabled ? 'enabled' : 'disabled';
    await Notification.createNotification({
      type: isEnabled ? 'module_enabled' : 'module_disabled',
      recipient: user._id,
      recipientModel: 'EximclientUser',
      sender: admin._id,
      senderModel: 'Admin',
      title: `Module Access ${action.charAt(0).toUpperCase() + action.slice(1)}`,
      message: `Access to ${moduleAccess.moduleName} has been ${action} by ${admin.name}.`,
      data: {
        moduleKey,
        moduleName: moduleAccess.moduleName,
        isEnabled,
        permissions: moduleAccess.permissions
      },
      priority: 'medium'
    });

    // Log activity

    res.json({
      success: true,
      message: `Module access ${action} successfully.`,
      data: moduleAccess
    });

  } catch (error) {
    console.error("Manage module access error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to manage module access."
    });
  }
};

/**
 * Get User Details
 */
export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const admin = req.user;

    // Find user
    const user = await EximclientUser.findById(userId)
      .select('-password')
      .populate('adminId', 'name email ie_code_no')
      .populate('verifiedBy', 'name email');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    // Check if admin has permission
    if (user.ie_code_no !== admin.ie_code_no) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view this user."
      });
    }

    // Get module access
    const moduleAccess = await ModuleAccess.find({ userId: userId });

    res.json({
      success: true,
      data: {
        user,
        moduleAccess
      }
    });

  } catch (error) {
    console.error("Get user details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user details."
    });
  }
};

/**
 * Admin Logout
 */
export const logoutAdmin = async (req, res) => {
  try {
    // Update last logout time
    const admin = await AdminModel.findById(req.user._id);
    if (admin) {
      admin.lastLogout = new Date();
      await admin.save();
    }

    // Clear cookies
    res.clearCookie('admin_access_token');
    res.clearCookie('admin_refresh_token');

    res.json({
      success: true,
      message: "Logged out successfully."
    });

  } catch (error) {
    console.error("Admin logout error:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed."
    });
  }
};


/**
 * Get Available Modules
 */
function getAvailableModules() {
  return [
    {
      key: 'import_dsr',
      name: 'Import DSR',
      description: 'Import Daily Status Report management',
      icon: 'import_export',
      category: 'imports'
    },
    {
      key: 'net_weight',
      name: 'Net Weight Calculator',
      description: 'Calculate net weights for shipments',
      icon: 'scale',
      category: 'calculations'
    },
    {
      key: 'analytics',
      name: 'Analytics Dashboard',
      description: 'View analytics and reports',
      icon: 'analytics',
      category: 'reports'
    },
    {
      key: 'document_management',
      name: 'Document Management',
      description: 'Manage import/export documents',
      icon: 'folder',
      category: 'documents'
    },
    {
      key: 'compliance_tracking',
      name: 'Compliance Tracking',
      description: 'Track compliance requirements',
      icon: 'verified',
      category: 'compliance'
    }
  ];
}

export default {
  loginAdmin,
  getAdminDashboard,
  getUsers,
  updateUserStatus,
  manageModuleAccess,
  getUserDetails,
  logoutAdmin
};
