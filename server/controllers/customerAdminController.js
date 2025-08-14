import CustomerModel from "../models/customerModel.js";
import EximclientUser from "../models/eximclientUserModel.js";
import Notification from "../models/notificationModel.js";
import { sendUserAuthResponse } from "../middlewares/authMiddleware.js";
import { logActivity } from "../utils/activityLogger.js";

/**
 * Customer Login (acting as admin for users)
 */
export const loginCustomerAdmin = async (req, res) => {
  try {
    const { ie_code_no, password } = req.body;

    // Validate required fields
    if (!ie_code_no || !password) {
      return res.status(400).json({
        success: false,
        message: "IE Code and password are required."
      });
    }

    // Find customer by IE code
    const customer = await CustomerModel.findOne({ 
      ie_code_no: ie_code_no.toUpperCase(),
      isActive: true 
    });

    if (!customer) {
      return res.status(401).json({
        success: false,
        message: "Invalid IE Code or password."
      });
    }

    // Verify password
    const isPasswordValid = await customer.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid IE Code or password."
      });
    }

    // Update last login
    customer.lastLogin = new Date();
    await customer.save();

    // Log activity
    await logActivity(
      customer._id,
      'CUSTOMER_ADMIN_LOGIN',
      'Customer logged in as admin',
      { ie_code_no: customer.ie_code_no, name: customer.name },
      req.ip
    );

    // Send auth response with admin role
    sendUserAuthResponse({ 
      ...customer.toObject(), 
      role: 'customer_admin' 
    }, 'customer_admin', 200, res);

  } catch (error) {
    console.error("Customer admin login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed. Please try again later."
    });
  }
};

/**
 * Get Customer Admin Dashboard
 */
export const getCustomerAdminDashboard = async (req, res) => {
  try {
    const customer = req.user;

    // Get basic statistics
    const totalUsers = await EximclientUser.countDocuments({ ie_code_no: customer.ie_code_no });
    const pendingUsers = await EximclientUser.countDocuments({ 
      ie_code_no: customer.ie_code_no, 
      status: 'pending' 
    });
    const activeUsers = await EximclientUser.countDocuments({ 
      ie_code_no: customer.ie_code_no, 
      isActive: true 
    });
    const inactiveUsers = await EximclientUser.countDocuments({ 
      ie_code_no: customer.ie_code_no, 
      isActive: false 
    });

    // Get recent users (limit to 5)
    const recentUsers = await EximclientUser.find({ 
      ie_code_no: customer.ie_code_no 
    })
      .sort({ createdAt: -1 })
      .limit(5);

    // Get recent notifications
    const notifications = await Notification.find({
      recipient: customer._id,
      recipientModel: 'Customer'
    })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        customer: {
          name: customer.name,
          ie_code_no: customer.ie_code_no,
          assignedModules: customer.assignedModules || []
        },
        statistics: {
          totalUsers,
          pendingUsers,
          activeUsers,
          inactiveUsers
        },
        recentUsers,
        notifications,
        availableModules: getAvailableModules()
      }
    });

  } catch (error) {
    console.error("Get customer admin dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data."
    });
  }
};

/**
 * Get Users for Customer Admin
 */
export const getCustomerUsers = async (req, res) => {
  try {
    const customer = req.user;
    const { status, page = 1, limit = 10, search } = req.query;

    // Build query
    const query = { ie_code_no: customer.ie_code_no };
    
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
      .populate('adminId', 'name ie_code_no')
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
    console.error("Get customer users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users."
    });
  }
};

/**
 * Update User Status (Customer Admin)
 */
export const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;
    const customer = req.user;

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

    // Check if customer has permission to manage this user
    if (user.ie_code_no !== customer.ie_code_no) {
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
      user.verifiedBy = customer._id;
    }

    await user.save();

    // Create notification for user
    let notificationMessage = '';
    let notificationType = '';
    
    switch (status) {
      case 'active':
        notificationMessage = `Your account has been activated by ${customer.name}. You can now access the system.`;
        notificationType = 'user_activated';
        break;
      case 'inactive':
        notificationMessage = `Your account has been deactivated by ${customer.name}. ${reason ? 'Reason: ' + reason : ''}`;
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
      sender: customer._id,
      senderModel: 'Customer',
      title: 'Account Status Updated',
      message: notificationMessage,
      data: {
        oldStatus,
        newStatus: status,
        reason: reason || null,
        customerName: customer.name
      },
      priority: status === 'inactive' ? 'high' : 'medium'
    });

    // Log activity
    await logActivity(
      customer._id,
      'USER_STATUS_UPDATE',
      `Updated user ${user.name} status from ${oldStatus} to ${status}`,
      { 
        userId: user._id,
        userEmail: user.email,
        oldStatus,
        newStatus: status,
        reason 
      },
      req.ip
    );

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
 * Get Available Modules (based on customer's assigned modules)
 */
function getAvailableModules() {
  return [
    {
      key: 'importdsr',
      name: 'Import DSR',
      description: 'Import Daily Status Report management',
      icon: 'import_export',
      category: 'imports',
      route: '/importdsr'
    },
    {
      key: 'netpage',
      name: 'Net Weight Calculator',
      description: 'Calculate net weights for shipments',
      icon: 'scale',
      category: 'calculations',
      route: '/netpage'
    },
    {
      key: 'analytics',
      name: 'Analytics Dashboard',
      description: 'View analytics and reports',
      icon: 'analytics',
      category: 'reports',
      route: '/analytics'
    },
    {
      key: 'trademasterguide',
      name: 'Trade Master Guide',
      description: 'Trade master guide and tutorials',
      icon: 'school',
      category: 'education',
      route: '/trademasterguide'
    }
  ];
}

export default {
  loginCustomerAdmin,
  getCustomerAdminDashboard,
  getCustomerUsers,
  updateUserStatus
};
