import EximclientUser from "../models/eximclientUserModel.js";
import AdminModel from "../models/adminModel.js";
import CustomerModel from "../models/customerModel.js";
import ModuleAccess from "../models/moduleAccessModel.js";
import Notification from "../models/notificationModel.js";
import { sendUserAuthResponse } from "../middlewares/authMiddleware.js";
import { logActivity } from "../utils/activityLogger.js";
import crypto from "crypto";

/**
 * User Registration
 */
export const registerUser = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      ie_code_no, 
      importer
    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !ie_code_no || !importer) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided (name, email, password, ie_code_no, importer)."
      });
    }

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address."
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long."
      });
    }

    // Check if email already exists
    const existingUser = await EximclientUser.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered. Please use a different email or login."
      });
    }

    // Verify IE code exists and get associated customer (who acts as admin)
    const ieCodeUpper = ie_code_no.toUpperCase();
    const customer = await CustomerModel.findOne({ ie_code_no: ieCodeUpper });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Invalid IE Code. Please contact support."
      });
    }

    // Check if customer is active
    if (!customer.isActive) {
      return res.status(404).json({
        success: false,
        message: "IE Code is inactive. Please contact support."
      });
    }

    // Create user with customer as admin
    const user = new EximclientUser({
      name: name.trim(),
      email: email.toLowerCase(),
      password,
      ie_code_no: ieCodeUpper,
      importer: importer.trim(),
      adminId: customer._id, // Using customer as admin
      status: 'pending',
      isActive: false,
      registrationIp: req.ip || req.connection.remoteAddress,
      
    });

    // Generate email verification token
    user.generateVerificationToken();
    
    await user.save();

    // Create notification for customer (who acts as admin)
    await Notification.createNotification({
      type: 'user_registration',
      recipient: customer._id,
      recipientModel: 'Customer', // Changed to Customer
      title: 'New User Registration',
      message: `New user ${name} (${email}) has registered under your IE Code ${ieCodeUpper}. Please verify and activate their account.`,
      data: {
        userId: user._id,
        userEmail: email,
        userName: name,
        ie_code_no: ieCodeUpper
      },
      priority: 'medium',
      actionRequired: true,
      actionUrl: `/admin/users/pending`
    });

    // Log activity
    await logActivity(
      user._id,
      'USER_REGISTRATION',
      'User registered successfully',
      { email, ie_code_no: ieCodeUpper },
      req.ip
    );

    res.status(201).json({
      success: true,
      message: "Registration successful! Your account is pending verification. You will be notified once approved.",
      data: {
        userId: user._id,
        email: user.email,
        status: user.status
      }
    });

  } catch (error) {
    console.error("Registration error:", error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already exists. Please use a different email."
      });
    }

    res.status(500).json({
      success: false,
      message: "Registration failed. Please try again later."
    });
  }
};

/**
 * User Login
 */
export const loginUser = async (req, res) => {
  try {
    console.log("Login request started");
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    console.log("Finding user:", email);
    // Find user by email and select necessary fields
    const user = await EximclientUser.findOne({ 
      email: email.toLowerCase() 
    })
    .select('name email password ie_code_no isAdmin adminId status isActive lastLogin assignedModules role importer assignedImporterName jobsTabVisible gandhidhamTabVisible' )
    .populate('adminId', 'name ie_code_no'); // Populating customer as admin

    if (!user) {
      console.log("User not found for email:", email);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    console.log("User found:", { id: user._id, email: user.email, status: user.status });

    // // Check if account is locked
    // if (user.isLocked) {
    //   return res.status(423).json({
    //     success: false,
    //     message: "Account is temporarily locked due to multiple failed login attempts. Please try again later."
    //   });
    // }

    console.log("Starting password verification");
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    console.log("Password verification result:", isPasswordValid);
    
    if (!isPasswordValid) {
      console.log("Password invalid, incrementing login attempts");
      // Increment login attempts
      await user.loginAttempts();
      
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    console.log("Password valid, proceeding with login");

    // // Reset login attempts on successful login
    // if (user.loginAttempts > 0) {
    //   await user.resetLoginAttempts();
    // }

    console.log("Updating last login timestamp");
    // Update last login using updateOne to avoid full document validation
    await EximclientUser.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );
    console.log("Last login updated successfully");

    console.log("Starting activity logging");
   // Log activity - temporarily commented out for debugging
    // await logActivity(
    //   user._id,
    //   'USER_LOGIN',
    //   'User logged in successfully',
    //   { email: user.email },
    //   req.ip
    // );
    // console.log("Activity logging completed");

    console.log("Sending auth response");
    // Send auth response
    sendUserAuthResponse(user, 'user', 200, res, true);
    console.log("Auth response sent successfully");

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed. Please try again later."
    });
  }
};

/**
 * Get User Profile
 */
export const getUserProfile = async (req, res) => {
  try {
    const user = await EximclientUser.findById(req.user._id)
      .populate('adminId', 'name ie_code_no') // Populating customer as admin
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    // Get user's module access
    const moduleAccess = await ModuleAccess.find({ 
      userId: user._id,
      isEnabled: true 
    });

    res.json({
      success: true,
      data: {
        user,
        moduleAccess,
        availableModules: getAvailableModules()
      }
    });

  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user profile."
    });
  }
};

/**
 * Get User Dashboard Data
 */
export const getUserDashboard = async (req, res) => {
  try {
    const user = req.user;

    // Get user's module access
    const moduleAccess = await ModuleAccess.find({ 
      userId: user._id 
    });

    // Get available modules
    const availableModules = getAvailableModules();

    // Create dashboard data
    const dashboardData = {
      user: {
        name: user.name,
        email: user.email,
        status: user.status,
        ie_code_no: user.ie_code_no,
        lastLogin: user.lastLogin
      },
      modules: availableModules.map(module => {
        const access = moduleAccess.find(ma => ma.moduleKey === module.key);
        return {
          ...module,
          isEnabled: access ? access.isEnabled : false,
          canAccess: access ? access.canAccessNow() : false,
          lastAccessed: access ? access.lastAccessed : null,
          permissions: access ? access.permissions : {
            canView: false,
            canEdit: false,
            canDelete: false,
            canExport: false
          }
        };
      }),
      notifications: await Notification.find({
        recipient: user._id,
        recipientModel: 'EximclientUser',
        isRead: false
      }).sort({ createdAt: -1 }).limit(5)
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error("Get dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data."
    });
  }
};

/**
 * User Logout
 */
export const logoutUser = async (req, res) => {
  try {
    // Update last logout time
    const user = await EximclientUser.findById(req.user._id);
    if (user) {
      user.lastLogout = new Date();
      await user.save();

      // Log activity
      await logActivity(
        user._id,
        'USER_LOGOUT',
        'User logged out',
        { email: user.email },
        req.ip
      );
    }

    // Clear cookies
    res.clearCookie('user_access_token');
    res.clearCookie('user_refresh_token');

    res.json({
      success: true,
      message: "Logged out successfully."
    });

  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed."
    });
  }
};

/**
 * Request Module Access
 */
export const requestModuleAccess = async (req, res) => {
  try {
    const { moduleKey, reason } = req.body;
    const user = req.user;

    if (!moduleKey) {
      return res.status(400).json({
        success: false,
        message: "Module key is required."
      });
    }

    // Check if module exists
    const availableModules = getAvailableModules();
    const module = availableModules.find(m => m.key === moduleKey);
    if (!module) {
      return res.status(404).json({
        success: false,
        message: "Invalid module key."
      });
    }

    // Check if access already exists
    const existingAccess = await ModuleAccess.findOne({
      userId: user._id,
      moduleKey
    });

    if (existingAccess) {
      return res.status(409).json({
        success: false,
        message: "Module access already requested or granted."
      });
    }

    // Create module access request
    const moduleAccess = new ModuleAccess({
      userId: user._id,
      ie_code_no: user.ie_code_no,
      moduleName: module.name,
      moduleKey,
      isEnabled: false,
      notes: reason || 'User requested access'
    });

    await moduleAccess.save();

    // Notify admin
    await Notification.createNotification({
      type: 'module_access_request',
      recipient: user.adminId,
      recipientModel: 'Admin',
      sender: user._id,
      senderModel: 'EximclientUser',
      title: 'Module Access Request',
      message: `User ${user.name} has requested access to ${module.name}. Reason: ${reason || 'Not specified'}`,
      data: {
        userId: user._id,
        moduleKey,
        moduleName: module.name,
        reason
      },
      priority: 'medium',
      actionRequired: true
    });

    res.status(201).json({
      success: true,
      message: "Module access requested successfully. Admin will review your request.",
      data: moduleAccess
    });

  } catch (error) {
    console.error("Request module access error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to request module access."
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
  registerUser,
  loginUser,
  getUserProfile,
  getUserDashboard,
  logoutUser,
  requestModuleAccess
};
