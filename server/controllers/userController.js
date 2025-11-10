import EximclientUser from "../models/eximclientUserModel.js";
import AdminModel from "../models/adminModel.js";
import CustomerModel from "../models/customerModel.js";
import ModuleAccess from "../models/moduleAccessModel.js";
import Notification from "../models/notificationModel.js";
import { sendUserAuthResponse } from "../middlewares/authMiddleware.js";
import { logActivity } from "../utils/activityLogger.js";
import crypto from "crypto";
import { sendVerificationEmail } from "../services/emailService.js";
import { sendPasswordResetEmail } from "../services/emailService.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || "12h";
/**
 * User Registration
 */

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "All required fields must be provided (name, email, password).",
      });
    }

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long.",
      });
    }

    // Check if email already exists
    const existingUser = await EximclientUser.findOne({
      email: email.toLowerCase(),
    });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "Email already registered. Please use a different email or login.",
      });
    }

    // Create user instance (not saved yet)
    const user = new EximclientUser({
      name: name.trim(),
      email: email.toLowerCase(),
      password,
      status: "pending",
      isActive: false,
      emailVerified: false,
      registrationIp: req.ip || req.connection.remoteAddress,
    });

    // Generate email verification token and assign to user instance
    const emailVerificationToken = user.generateVerificationToken();

    // Save user with verification token persisted
    await user.save();

    // Send verification email after saving
    try {
      await sendVerificationEmail(
        user.email,
        user.name,
        emailVerificationToken
      );
      console.log(`Verification email sent to ${user.email}`);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Optionally handle by deleting the user or retrying
    }

    // Log activity

    res.status(201).json({
      success: true,
      message:
        "Registration successful! Please check your email to verify your account before logging in.",
      data: {
        userId: user._id,
        email: user.email,
        status: user.status,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already exists. Please use a different email.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Registration failed. Please try again later.",
    });
  }
};

// routes/controllers/userController.js
/**
 * Verify Email
 */
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required",
      });
    }

    // Find user with this verification token
    const user = await EximclientUser.findOne({
      emailVerificationToken: token,
      emailVerificationTokenExpires: { $gt: Date.now() }, // Check if token hasn't expired
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
      });
    }

    // Update user as verified
    user.emailVerified = true;
    user.emailVerificationToken = undefined; // Clear the token
    user.emailVerificationTokenExpires = undefined; // Clear the expiration
    user.isActive = true;
    user.status = "active";

    await user.save();

    // ✅ ADD THIS SUCCESS RESPONSE!
    // This tells the frontend that everything worked.
    res.status(200).json({
      success: true,
      message: "Email verified successfully.",
    });
  } catch (error) {
    console.error("Email verification error:", error);

    // Send a generic server error response in case of other issues
    res.status(500).json({
      success: false,
      message: "An error occurred during email verification.",
    });
  }
};

// This is the controller for the FIRST step of the process
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const user = await EximclientUser.findOne({ email });

    // Important: Don't reveal if a user exists or not for security reasons.
    // Always send a success-like response.
    if (!user) {
      return res
        .status(200)
        .json({
          success: true,
          message:
            "If an account with that email exists, a password reset link has been sent.",
        });
    }

    // Generate the reset token (this is the unhashed version)
    const resetToken = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false }); // Skip validation to save without a password change

    // Send the email
    await sendPasswordResetEmail(user.email, user.name, resetToken);

    res
      .status(200)
      .json({
        success: true,
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
  } catch (error) {
    console.error("Request password reset error:", error);
    // In case of error, clear the token to allow the user to try again
    const user = await EximclientUser.findOne({ email: req.body.email });
    if (user) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
    }
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to send password reset email.",
      });
  }
};
/**
 * Forgot Password
 */
// This is your provided controller, renamed and modified for the SECOND step.
// It now uses the token from the URL to reset the password.
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Token and new password are required",
        });
    }

    // 1. Hash the incoming token to match the one in the DB
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // 2. Find user with the valid, unexpired hashed token
    const user = await EximclientUser.findOne({
      passwordResetToken: hashedToken, // Use the hashed token for lookup
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired reset token" });
    }

    // Update password (hashed through pre-save hook)
    user.password = newPassword;

    // Clear reset token and expiry
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    res
      .status(200)
      .json({
        success: true,
        message: "Password has been reset successfully. Please log in.",
      });
  } catch (error) {
    console.error("Password reset error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to reset password" });
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
        message: "Email and password are required.",
      });
    }

    console.log("Finding user by email or IE code:", email);
    // Find user by email or IE code and select necessary fields
    const user = await EximclientUser.findOne({
      $or: [
        { email: email.toLowerCase() },
        { ie_code_no: email.toUpperCase() },
      ],
    })
      .select(
        "name email password ie_code_no isAdmin adminId status isActive lastLogin assignedModules role importer assignedImporterName jobsTabVisible gandhidhamTabVisible emailVerified ie_code_assignments documents"
      )
      .populate("adminId", "name ie_code_no"); // Populating customer as admin

    if (!user) {
      console.log("User not found for email:", email);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    console.log("User found:", {
      id: user._id,
      email: user.email,
      status: user.status,
    });

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
      // await user.loginAttempts();

      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
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

    console.log("Sending auth response");
    // Send auth response
    sendUserAuthResponse(user, "user", 200, res, true);
    console.log("Auth response sent successfully");
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed. Please try again later.",
    });
  }
};

/**
 * Get User Profile
 */
export const getUserProfile = async (req, res) => {
  try {
    const user = await EximclientUser.findById(req.user._id)
      .populate("adminId", "name ie_code_no") // Populating customer as admin
      .select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Get user's module access
    const moduleAccess = await ModuleAccess.find({
      userId: user._id,
      isEnabled: true,
    });

    res.json({
      success: true,
      data: {
        user,
        moduleAccess,
        availableModules: getAvailableModules(),
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user profile.",
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
      userId: user._id,
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
        lastLogin: user.lastLogin,
      },
      modules: availableModules.map((module) => {
        const access = moduleAccess.find((ma) => ma.moduleKey === module.key);
        return {
          ...module,
          isEnabled: access ? access.isEnabled : false,
          canAccess: access ? access.canAccessNow() : false,
          lastAccessed: access ? access.lastAccessed : null,
          permissions: access
            ? access.permissions
            : {
                canView: false,
                canEdit: false,
                canDelete: false,
                canExport: false,
              },
        };
      }),
      notifications: await Notification.find({
        recipient: user._id,
        recipientModel: "EximclientUser",
        isRead: false,
      })
        .sort({ createdAt: -1 })
        .limit(5),
    };

    res.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error("Get dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data.",
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
    }

    // Clear cookies
    res.clearCookie("user_access_token");
    res.clearCookie("user_refresh_token");

    res.json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed.",
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
        message: "Module key is required.",
      });
    }

    // Check if module exists
    const availableModules = getAvailableModules();
    const module = availableModules.find((m) => m.key === moduleKey);
    if (!module) {
      return res.status(404).json({
        success: false,
        message: "Invalid module key.",
      });
    }

    // Check if access already exists
    const existingAccess = await ModuleAccess.findOne({
      userId: user._id,
      moduleKey,
    });

    if (existingAccess) {
      return res.status(409).json({
        success: false,
        message: "Module access already requested or granted.",
      });
    }

    // Create module access request
    const moduleAccess = new ModuleAccess({
      userId: user._id,
      ie_code_no: user.ie_code_no,
      moduleName: module.name,
      moduleKey,
      isEnabled: false,
      notes: reason || "User requested access",
    });

    await moduleAccess.save();

    // Notify admin
    await Notification.createNotification({
      type: "module_access_request",
      recipient: user.adminId,
      recipientModel: "Admin",
      sender: user._id,
      senderModel: "EximclientUser",
      title: "Module Access Request",
      message: `User ${user.name} has requested access to ${
        module.name
      }. Reason: ${reason || "Not specified"}`,
      data: {
        userId: user._id,
        moduleKey,
        moduleName: module.name,
        reason,
      },
      priority: "medium",
      actionRequired: true,
    });

    res.status(201).json({
      success: true,
      message:
        "Module access requested successfully. Admin will review your request.",
      data: moduleAccess,
    });
  } catch (error) {
    console.error("Request module access error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to request module access.",
    });
  }
};

export const generateSSOToken = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }
    console.log(
      `Generating SSO token for user: ${req.user.id} (${req.user.name})`
    );

    // Get requested ie_code_no from query or body or params
    // (Assuming frontend sends as query param ?ie_code_no=xxxx)
    const requestedIeCode =
      req.query.ie_code_no || req.body.ie_code_no || req.params.ie_code_no;
    if (!requestedIeCode) {
      return res.status(400).json({
        success: false,
        message: "Missing IE code parameter",
      });
    }

    // Extract user's assigned ie codes (array of strings)
    let userIeCodes = [];
    if (
      Array.isArray(req.user.ie_code_assignments) &&
      req.user.ie_code_assignments.length > 0
    ) {
      userIeCodes = req.user.ie_code_assignments.map((a) => a.ie_code_no);
    } else if (req.user.ie_code_no) {
      userIeCodes = [req.user.ie_code_no];
    }

    // Check if requested IE code is assigned to this user
    if (!userIeCodes.includes(requestedIeCode)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: IE code not assigned to user",
      });
    }

    console.log(
      `User IE codes: ${userIeCodes.join(
        ", "
      )}, requested IE code: ${requestedIeCode}`
    );

    // Generate short-lived SSO token with standard JWT format
    const ssoToken = jwt.sign(
      {
        sub: req.user.id, // Standard JWT subject field
        ie_code_no: requestedIeCode, // Pass requested IE code only
        name: req.user.name,
      },
      JWT_SECRET,
      { expiresIn: "1d" } // 1 day expiry for security
    );

    res.status(200).json({
      success: true,
      message: "SSO token generated successfully",
      data: {
        token: ssoToken,
        ie_code_no: requestedIeCode,
        expires_in: "1d",
      },
    });
  } catch (error) {
    console.error("Error generating SSO token:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate SSO token",
      error: error.message,
    });
  }
};
/**
 * Get Current User Data
 */
export const getCurrentUser = async (req, res) => {
  try {
    const user = await EximclientUser.findById(req.user._id)
      .select("-password") // Exclude password
      .populate("adminId", "name ie_code_no"); // Populate admin data if needed

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Get user's module access
    const moduleAccess = await ModuleAccess.find({
      userId: user._id,
      isEnabled: true,
    });

    // Get document expiry information
    const today = new Date();
    const documents = user.documents || [];

    const expiringDocs = documents.filter((doc) => {
      if (!doc.expirationDate) return false;
      const expirationDate = new Date(doc.expirationDate);
      const daysUntilExpiration = Math.ceil(
        (expirationDate - today) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiration > 0 && daysUntilExpiration <= 30;
    });

    const expiredDocs = documents.filter((doc) => {
      if (!doc.expirationDate) return false;
      const expirationDate = new Date(doc.expirationDate);
      const daysUntilExpiration = Math.ceil(
        (expirationDate - today) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiration <= 0;
    });

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          status: user.status,
          isActive: user.isActive,
          role: user.role,
          ie_code_no: user.ie_code_no,
          ie_code_assignments: user.ie_code_assignments,
          documents: user.documents,
          aeo_reminder_days: user.aeo_reminder_days,
          aeo_reminder_enabled: user.aeo_reminder_enabled,
          lastLogin: user.lastLogin,
          assignedModules: user.assignedModules,
          jobsTabVisible: user.jobsTabVisible,
          gandhidhamTabVisible: user.gandhidhamTabVisible,
          emailVerified: user.emailVerified,
          allowedColumns: user.allowedColumns,
        },
        moduleAccess,
        documentAlerts: {
          expiring: expiringDocs,
          expired: expiredDocs,
        },
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user data.",
    });
  }
};

/**
 * Get Available Modules
 */
function getAvailableModules() {
  return [
    {
      key: "import_dsr",
      name: "Import DSR",
      description: "Import Daily Status Report management",
      icon: "import_export",
      category: "imports",
    },
    {
      key: "net_weight",
      name: "Net Weight Calculator",
      description: "Calculate net weights for shipments",
      icon: "scale",
      category: "calculations",
    },
    {
      key: "analytics",
      name: "Analytics Dashboard",
      description: "View analytics and reports",
      icon: "analytics",
      category: "reports",
    },
    {
      key: "document_management",
      name: "Document Management",
      description: "Manage import/export documents",
      icon: "folder",
      category: "documents",
    },
    {
      key: "compliance_tracking",
      name: "Compliance Tracking",
      description: "Track compliance requirements",
      icon: "verified",
      category: "compliance",
    },
  ];
}

export default {
  registerUser,
  loginUser,
  getUserProfile,
  getUserDashboard,
  logoutUser,
  requestModuleAccess,
  generateSSOToken,
};
