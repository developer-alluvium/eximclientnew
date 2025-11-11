import SuperAdminModel from "../models/superAdminModel.js";
import AdminModel from "../models/adminModel.js";
import EximclientUser from "../models/eximclientUserModel.js";
import CustomerModel from "../models/customerModel.js";
import JobModel from "../models/jobModel.js";
import Notification from "../models/notificationModel.js";
import { sendUserAuthResponse } from "../middlewares/authMiddleware.js";
import { logActivity } from "../utils/activityLogger.js";
import jwt from "jsonwebtoken";
import CustomerKycModel from "../models/customerKycModel.js";

// Environment variables
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || "your-secret-key";
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || "12h";
// Get tab visibility for a customer
export async function getCustomerTabVisibility(req, res) {
  try {
    const { customerId } = req.params;
    const customer = await CustomerModel.findById(customerId).select(
      "jobsTabVisible gandhidhamTabVisible"
    );
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json({
      jobsTabVisible: customer.jobsTabVisible,
      gandhidhamTabVisible: customer.gandhidhamTabVisible,
    });
  } catch (error) {
    console.error("Error fetching customer tab visibility:", error);
    res.status(500).json({ error: "Error fetching customer tab visibility" });
  }
}

// Update tab visibility for a customer
export async function updateCustomerTabVisibility(req, res) {
  try {
    const { customerId } = req.params;
    const { jobsTabVisible, gandhidhamTabVisible } = req.body;
    const customer = await CustomerModel.findById(customerId);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    if (typeof jobsTabVisible === "boolean")
      customer.jobsTabVisible = jobsTabVisible;
    if (typeof gandhidhamTabVisible === "boolean")
      customer.gandhidhamTabVisible = gandhidhamTabVisible;
    await customer.save();
    res.json({
      success: true,
      jobsTabVisible: customer.jobsTabVisible,
      gandhidhamTabVisible: customer.gandhidhamTabVisible,
    });
  } catch (error) {
    console.error("Error updating customer tab visibility:", error);
    res.status(500).json({ error: "Error updating customer tab visibility" });
  }
}
// Endpoint to get allowed customers for Gandhidham tab

/**
 * SuperAdmin Login
 */
export const superAdminLogin = async (req, res) => {
  try {
    // 1. Changed to destructure 'email' instead of 'username'
    const { email, password } = req.body;

    console.log(`SuperAdmin login attempt for email: ${email}`);

    // 2. Updated validation to check for 'email'
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // 3. Find superadmin by 'email'
    const superAdmin = await SuperAdminModel.findOne({ email });

    if (!superAdmin) {
      console.log(`SuperAdmin with email ${email} not found`);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if account is locked
    if (superAdmin.isLocked()) {
      console.log(`SuperAdmin account for email ${email} is locked`);
      return res.status(423).json({
        success: false,
        message:
          "Account is temporarily locked due to too many failed login attempts. Please try again later.",
      });
    }

    // Check if account is active
    if (!superAdmin.isActive) {
      console.log(`SuperAdmin account for email ${email} is inactive`);
      return res.status(401).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    // Verify password
    const isPasswordCorrect = await superAdmin.comparePassword(password);

    if (!isPasswordCorrect) {
      console.log(`Invalid password for SuperAdmin with email ${email}`);

      // Increment login attempts
      await superAdmin.incLoginAttempts();

      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Reset login attempts on successful login
    await superAdmin.resetLoginAttempts();

    // Generate JWT token (payload remains the same)
    const token = jwt.sign(
      {
        id: superAdmin._id,
        username: superAdmin.username,
        role: "superadmin",
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );

    console.log(
      `SuperAdmin ${superAdmin.username} (email: ${email}) logged in successfully`
    );

    // Send successful response
    res.status(200).json({
      success: true,
      message: "SuperAdmin login successful",
      token,
      superAdmin: {
        id: superAdmin._id,
        username: superAdmin.username,
        email: superAdmin.email,
        lastLogin: superAdmin.lastLogin,
        role: "superadmin",
      },
    });
  } catch (error) {
    console.error("SuperAdmin login error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during login",
      error: error.message,
    });
  }
};

/**
 * SuperAdmin Logout
 */
export const superAdminLogout = async (req, res) => {
  try {
    const { userId } = req.body;

    if (userId) {
      // Update last logout time
      await SuperAdminModel.findByIdAndUpdate(
        userId,
        { lastLogout: new Date() },
        { new: true }
      );
    }

    res.status(200).json({
      success: true,
      message: "SuperAdmin logged out successfully",
    });
  } catch (error) {
    console.error("SuperAdmin logout error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during logout",
      error: error.message,
    });
  }
};

/**
 * Get SuperAdmin Profile
 */
export const getSuperAdminProfile = async (req, res) => {
  try {
    const superAdmin = await SuperAdminModel.findById(req.superAdmin.id).select(
      "-password"
    );

    if (!superAdmin) {
      return res.status(404).json({
        success: false,
        message: "SuperAdmin not found",
      });
    }

    res.status(200).json({
      success: true,
      superAdmin: {
        id: superAdmin._id,
        username: superAdmin.username,
        email: superAdmin.email,
        lastLogin: superAdmin.lastLogin,
        role: "superadmin",
      },
    });
  } catch (error) {
    console.error("Get SuperAdmin profile error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching profile",
      error: error.message,
    });
  }
};

/**
 * Middleware to protect SuperAdmin routes
 * Verifies JWT token and ensures user has superadmin role
 */
export const protectSuperAdmin = async (req, res, next) => {
  try {
    // Get token from Authorization header
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      console.log("No token provided for SuperAdmin protected route");
      return res.status(401).json({
        success: false,
        message: "Access denied. SuperAdmin authentication required.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if user has superadmin role
    if (decoded.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. SuperAdmin privileges required.",
      });
    }

    // Find superadmin by ID
    const superAdmin = await SuperAdminModel.findById(decoded.id);

    if (!superAdmin) {
      return res.status(401).json({
        success: false,
        message: "SuperAdmin not found",
      });
    }

    // Check if superadmin is active
    if (!superAdmin.isActive) {
      return res.status(401).json({
        success: false,
        message: "SuperAdmin account is inactive",
      });
    }

    // Set superadmin in request
    req.superAdmin = {
      id: superAdmin._id,
      username: superAdmin.username,
      email: superAdmin.email,
      role: "superadmin",
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Access denied. Invalid or expired token.",
      error: error.message,
    });
  }
};

/**
 * Create initial SuperAdmin (Development/Setup only)
 */
export const createInitialSuperAdmin = async (req, res) => {
  try {
    // Check if any superadmin already exists
    const existingCount = await SuperAdminModel.countDocuments();

    if (existingCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "SuperAdmin already exists. This endpoint is only for initial setup.",
      });
    }

    const { username, password, email } = req.body;

    // Validate input
    if (!username || !password || !email) {
      return res.status(400).json({
        success: false,
        message: "Please provide username, password, and email",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    // Create superadmin
    const superAdmin = new SuperAdminModel({
      username,
      password,
      email,
      isActive: true,
    });

    await superAdmin.save();

    console.log(`Initial SuperAdmin created: ${username}`);

    res.status(201).json({
      success: true,
      message: "Initial SuperAdmin created successfully",
      superAdmin: {
        id: superAdmin._id,
        username: superAdmin.username,
        email: superAdmin.email,
      },
    });
  } catch (error) {
    console.error("Create initial SuperAdmin error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while creating SuperAdmin",
      error: error.message,
    });
  }
};

/**
 * Register Admin
 */
export const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, ie_code_no } = req.body;
    const superAdmin = req.user;

    // Validate required fields
    if (!name || !email || !password || !ie_code_no) {
      return res.status(400).json({
        success: false,
        message: "All fields are required (name, email, password, ie_code_no).",
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
    const existingAdmin = await AdminModel.findOne({
      email: email.toLowerCase(),
    });
    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: "Email already registered. Please use a different email.",
      });
    }

    // Verify IE code exists
    const ieCodeUpper = ie_code_no.toUpperCase();
    const customer = await CustomerModel.findOne({ ie_code_no: ieCodeUpper });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message:
          "Invalid IE Code. Please verify the IE code exists in the system.",
      });
    }

    // Check if admin already exists for this IE code
    const existingAdminForIE = await AdminModel.findOne({
      ie_code_no: ieCodeUpper,
    });
    if (existingAdminForIE) {
      return res.status(409).json({
        success: false,
        message: "An admin already exists for this IE code.",
      });
    }

    // Create admin
    const admin = new AdminModel({
      name: name.trim(),
      email: email.toLowerCase(),
      password,
      ie_code_no: ieCodeUpper,
      createdBy: superAdmin._id,
      isActive: true,
    });

    await admin.save();

    // Create notification for the new admin (welcome message)
    await Notification.createNotification({
      type: "admin_created",
      recipient: admin._id,
      recipientModel: "Admin",
      sender: superAdmin._id,
      senderModel: "SuperAdmin",
      title: "Welcome to Admin Panel",
      message: `Your admin account has been created successfully for IE Code ${ieCodeUpper}. You can now manage users under this IE code.`,
      data: {
        ie_code_no: ieCodeUpper,
        createdBy: superAdmin.username,
      },
      priority: "medium",
    });

    res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      data: {
        adminId: admin._id,
        name: admin.name,
        email: admin.email,
        ie_code_no: admin.ie_code_no,
        isActive: admin.isActive,
        createdAt: admin.createdAt,
      },
    });
  } catch (error) {
    console.error("Admin registration error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Admin with this email already exists.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to register admin. Please try again later.",
    });
  }
};

/**
 * Get All Admins
 */
export const getAdmins = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;

    // Build query
    const query = {};

    if (status) {
      query.isActive = status === "active";
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { ie_code_no: { $regex: search, $options: "i" } },
      ];
    }

    // Get admins with pagination
    const admins = await AdminModel.find(query)
      .select("-password")
      .populate("createdBy", "username")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await AdminModel.countDocuments(query);

    // Get user counts for each admin
    const adminsWithStats = await Promise.all(
      admins.map(async (admin) => {
        const userCount = await EximclientUser.countDocuments({
          ie_code_no: admin.ie_code_no,
        });
        const activeUserCount = await EximclientUser.countDocuments({
          ie_code_no: admin.ie_code_no,
          status: "active",
        });

        return {
          ...admin.toObject(),
          userStats: {
            total: userCount,
            active: activeUserCount,
            pending: userCount - activeUserCount,
          },
        };
      })
    );

    res.json({
      success: true,
      data: {
        admins: adminsWithStats,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
        },
      },
    });
  } catch (error) {
    console.error("Get admins error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch admins.",
    });
  }
};

/**
 * Update Admin Status
 */
export const updateAdminStatus = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { isActive, reason } = req.body;
    const superAdmin = req.user;

    // Find admin
    const admin = await AdminModel.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found.",
      });
    }

    // Update admin status
    const oldStatus = admin.isActive;
    admin.isActive = isActive;
    await admin.save();

    // If deactivating admin, also deactivate all their users
    if (!isActive && oldStatus) {
      await EximclientUser.updateMany(
        { ie_code_no: admin.ie_code_no },
        { status: "inactive", isActive: false }
      );
    }

    // Create notification for admin
    await Notification.createNotification({
      type: isActive ? "admin_activated" : "admin_deactivated",
      recipient: admin._id,
      recipientModel: "Admin",
      sender: superAdmin._id,
      senderModel: "SuperAdmin",
      title: `Account ${isActive ? "Activated" : "Deactivated"}`,
      message: `Your admin account has been ${
        isActive ? "activated" : "deactivated"
      } by SuperAdmin. ${reason ? "Reason: " + reason : ""}`,
      data: {
        oldStatus,
        newStatus: isActive,
        reason: reason || null,
      },
      priority: isActive ? "medium" : "high",
    });

    // Log activity

    res.json({
      success: true,
      message: `Admin ${isActive ? "activated" : "deactivated"} successfully.`,
      data: {
        adminId: admin._id,
        oldStatus,
        newStatus: isActive,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Update admin status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update admin status.",
    });
  }
};

/**
 * Designate Customer as Admin
 * This function allows SuperAdmin to designate an existing customer as an admin
 */
export const designateCustomerAsAdmin = async (req, res) => {
  try {
    const { ie_code_no } = req.body;
    const superAdmin = req.user;

    // Validate required fields
    if (!ie_code_no) {
      return res.status(400).json({
        success: false,
        message: "IE Code is required.",
      });
    }

    // Find customer by IE code
    const ieCodeUpper = ie_code_no.toUpperCase();
    const customer = await CustomerModel.findOne({ ie_code_no: ieCodeUpper });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer with this IE Code not found.",
      });
    }

    // Check if customer is already active
    if (!customer.isActive) {
      return res.status(400).json({
        success: false,
        message: "Customer account is not active.",
      });
    }

    // Update customer's role to admin
    customer.role = "admin";
    customer.roleGrantedBy = superAdmin._id;
    customer.roleGrantedAt = new Date();

    await customer.save();

    // Log activity

    res.status(200).json({
      success: true,
      message: `Customer ${customer.name} has been promoted to admin role for IE Code ${ieCodeUpper}`,
      data: {
        customerId: customer._id,
        name: customer.name,
        ie_code_no: customer.ie_code_no,
        role: customer.role,
        promotedAt: customer.roleGrantedAt,
      },
    });
  } catch (error) {
    console.error("Designate customer as admin error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to designate customer as admin.",
    });
  }
};

/**
 * Get System Statistics
 */
export const getSystemStats = async (req, res) => {
  try {
    // Get counts
    const totalAdmins = await AdminModel.countDocuments({});
    const activeAdmins = await AdminModel.countDocuments({ isActive: true });
    const totalUsers = await EximclientUser.countDocuments({});
    const activeUsers = await EximclientUser.countDocuments({
      status: "active",
    });
    const pendingUsers = await EximclientUser.countDocuments({
      status: "pending",
    });
    const totalCustomers = await CustomerModel.countDocuments({});

    // Get recent activity
    const recentAdmins = await AdminModel.find({})
      .select("-password")
      .populate("createdBy", "username")
      .sort({ createdAt: -1 })
      .limit(5);

    const recentUsers = await EximclientUser.find({})
      .select("-password")
      .populate("adminId", "name email ie_code_no")
      .sort({ createdAt: -1 })
      .limit(5);

    // Get IE code distribution
    const ieCodeStats = await EximclientUser.aggregate([
      {
        $group: {
          _id: "$ie_code_no",
          userCount: { $sum: 1 },
          activeCount: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
          pendingCount: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
        },
      },
      { $sort: { userCount: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      data: {
        statistics: {
          admins: {
            total: totalAdmins,
            active: activeAdmins,
            inactive: totalAdmins - activeAdmins,
          },
          users: {
            total: totalUsers,
            active: activeUsers,
            pending: pendingUsers,
            inactive: totalUsers - activeUsers - pendingUsers,
          },
          customers: {
            total: totalCustomers,
          },
        },
        recentActivity: {
          admins: recentAdmins,
          users: recentUsers,
        },
        ieCodeDistribution: ieCodeStats,
      },
    });
  } catch (error) {
    console.error("Get system stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch system statistics.",
    });
  }
};

/**
 * Get All Customers
 */
export const getAllCustomers = async (req, res) => {
  try {
    const customers = await CustomerModel.find({})
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        customers: customers || [],
      },
    });
  } catch (error) {
    console.error("Get all customers error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customers.",
    });
  }
};

/**
 * Get Available IE Codes for Assignment from Job Model
 */
export const getAvailableIeCodes = async (req, res) => {
  try {
    // Use aggregation pipeline to get distinct IE codes from jobs for year "25-26"
    // and exclude IE codes that are already assigned to admins
    const pipeline = [
      // Match jobs for year "25-26" with non-empty ie_code_no
      {
        $match: {
          year: "25-26",
          ie_code_no: { $exists: true, $ne: "", $ne: null },
        },
      },
      // Group by ie_code_no to get distinct values with additional info
      {
        $group: {
          _id: "$ie_code_no",
          importer: { $first: "$importer" },
          jobCount: { $sum: 1 },
          lastJobDate: { $max: "$job_date" },
        },
      },
      // Lookup customer data to check admin status
      {
        $lookup: {
          from: "customers",
          localField: "_id",
          foreignField: "ie_code_no",
          as: "customerInfo",
        },
      },
      // Filter out IE codes where customer is already admin
      // {
      //   $match: {
      //     $or: [
      //       { customerInfo: { $size: 0 } }, // No customer record exists
      //       { "customerInfo.isAdmin": { $ne: true } } // Customer exists but not admin
      //     ]
      //   }
      // },
      // Project final structure
      {
        $project: {
          ie_code_no: "$_id",
          name: "$importer",
          jobCount: 1,
          lastJobDate: 1,
          customerId: { $arrayElemAt: ["$customerInfo._id", 0] },
          pan_number: { $arrayElemAt: ["$customerInfo.pan_number", 0] },
          _id: 0,
        },
      },
      // Sort by importer name
      {
        $sort: { name: 1 },
      },
    ];

    const availableIeCodes = await JobModel.aggregate(pipeline);

    res.json({
      success: true,
      data: {
        availableIeCodes: availableIeCodes.map((item) => ({
          ie_code_no: item.ie_code_no,
          name: item.name || `IE Code: ${item.ie_code_no}`,
          pan_number: item.pan_number || "Not Available",
          customerId: item.customerId || null,
          jobCount: item.jobCount,
          lastJobDate: item.lastJobDate,
        })),
      },
    });
  } catch (error) {
    console.error("Get available IE codes error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch available IE codes.",
    });
  }
};

/**
 * Get All Users
 */
export const getAllUsers = async (req, res) => {
  try {
    const users = await EximclientUser.find({})
      .select("-password")
      .populate("adminId", "name ie_code_no")
      .sort({ createdAt: -1 });

    // Get users with their admin status and corresponding customer info
    const usersWithAdminStatus = await Promise.all(
      users.map(async (user) => {
        const customerRecord = await CustomerModel.findOne({
          ie_code_no: user.ie_code_no,
        });
        return {
          ...user.toObject(),
          adminCustomer:
            user.isAdmin && customerRecord
              ? {
                  id: customerRecord._id,
                  name: customerRecord.name,
                  ie_code_no: customerRecord.ie_code_no,
                  adminRoleGrantedAt: customerRecord.adminRoleGrantedAt,
                }
              : null,
        };
      })
    );

    res.json({
      success: true,
      data: {
        users: usersWithAdminStatus || [],
      },
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users.",
    });
  }
};

/**
 * Update Customer Admin Status
 */
export const updateCustomerAdminStatus = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { isAdmin } = req.body;

    const customer = await CustomerModel.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    customer.isAdmin = isAdmin;
    await customer.save();

    // Log activity

    res.json({
      success: true,
      message: `Customer admin status ${
        isAdmin ? "granted" : "revoked"
      } successfully.`,
      data: {
        customer: {
          id: customer._id,
          name: customer.name,
          ie_code_no: customer.ie_code_no,
          isAdmin: customer.isAdmin,
        },
      },
    });
  } catch (error) {
    console.error("Update customer admin status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update customer admin status.",
    });
  }
};

/**
 * Promote User to Admin
 */
export const promoteUserToAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const { ie_code_no } = req.body; // Optional if user already has IE code

    const user = await EximclientUser.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Get existing IE code from user or use the provided one
    const existingIeCode = user.ie_code_no || user.assignedIeCode;
    const ieCodeToUse = ie_code_no || existingIeCode;

    // If no IE code is available (neither existing nor provided), require it
    if (!ieCodeToUse) {
      return res.status(400).json({
        success: false,
        message:
          "IE code is required to promote user to admin. Either provide an IE code or ensure the user already has one assigned.",
      });
    }

    // Find Customer record with the IE code
    const customer = await CustomerModel.findOne({ ie_code_no: ieCodeToUse });
    if (!customer) {
      return res.status(400).json({
        success: false,
        message: `No customer found with IE code ${ieCodeToUse}. Cannot promote user to admin.`,
      });
    }

    // Check if customer is already an admin
    if (customer.role === "admin") {
      return res.status(400).json({
        success: false,
        message: "This customer is already an admin.",
      });
    }

    // Update user record (only update IE code if a new one was provided)
    if (ie_code_no && ie_code_no !== existingIeCode) {
      user.ie_code_no = ie_code_no;
      user.assignedIeCode = ie_code_no;
      user.assignedImporterName = customer.name;
    }
    user.role = "admin";
    await user.save();

    // Update customer record to admin role
    customer.role = "admin";
    customer.roleGrantedBy = req.superAdmin.id;
    customer.roleGrantedAt = new Date();
    await customer.save();

    // Prepare log message
    const logMessage =
      ie_code_no && ie_code_no !== existingIeCode
        ? `Promoted user ${user.name} to admin and assigned new IE code ${ie_code_no}`
        : `Promoted user ${user.name} to admin using existing IE code ${ieCodeToUse}`;

    res.json({
      success: true,
      message:
        ie_code_no && ie_code_no !== existingIeCode
          ? "User promoted to admin and new IE code assigned successfully."
          : "User promoted to admin using existing IE code successfully.",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          ie_code_no: user.ie_code_no,
          assignedIeCode: user.assignedIeCode,
          assignedImporterName: user.assignedImporterName,
          role: user.role,
        },
        customer: {
          id: customer._id,
          name: customer.name,
          ie_code_no: customer.ie_code_no,
          role: customer.role,
          roleGrantedBy: customer.roleGrantedBy,
          roleGrantedAt: customer.roleGrantedAt,
        },
        ieCodeStatus: {
          used: ieCodeToUse,
          wasExisting: existingIeCode ? true : false,
          wasProvided: ie_code_no ? true : false,
          changed: ie_code_no && ie_code_no !== existingIeCode,
        },
      },
    });
  } catch (error) {
    console.error("Promote user to admin error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to promote user to admin.",
    });
  }
};

/**
 * Demote User from Admin
 */
export const demoteUserFromAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await EximclientUser.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Check if user is currently an admin
    if (user.role !== "admin") {
      return res.status(400).json({
        success: false,
        message: "User is not currently an admin.",
      });
    }

    // Get IE code from user (handle both ie_code_no and assignedIeCode fields)
    const userIeCode = user.ie_code_no || user.assignedIeCode;
    if (!userIeCode) {
      return res.status(400).json({
        success: false,
        message: "User does not have an IE code assigned.",
      });
    }

    // Find Customer record with the same IE code as the user
    const customer = await CustomerModel.findOne({ ie_code_no: userIeCode });
    if (!customer) {
      return res.status(400).json({
        success: false,
        message: "No customer found with this IE code.",
      });
    }

    if (customer.role !== "admin") {
      return res.status(400).json({
        success: false,
        message: "Customer with this IE code does not have admin role.",
      });
    }

    // Change user role back to customer
    user.role = "customer";
    // Optionally clear IE code assignment if you want to unassign completely
    // user.ie_code_no = null;
    // user.assignedIeCode = null;
    // user.assignedImporterName = null;
    await user.save();

    // Update customer record back to customer role
    customer.role = "customer";
    customer.roleGrantedBy = null;
    customer.roleGrantedAt = null; // Clear the granted date or set to demotion date
    await customer.save();

    res.json({
      success: true,
      message: "User demoted from admin to customer successfully.",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          ie_code_no: user.ie_code_no,
          role: user.role,
        },
        customer: {
          id: customer._id,
          name: customer.name,
          ie_code_no: customer.ie_code_no,
          role: customer.role,
          roleGrantedBy: customer.roleGrantedBy,
          roleGrantedAt: customer.roleGrantedAt,
        },
      },
    });
  } catch (error) {
    console.error("Demote user from admin error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to demote user from admin.",
    });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive, reason } = req.body;

    // Find user
    const user = await EximclientUser.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Update user status
    const oldStatus = user.isActive;
    user.isActive = isActive;
    user.status = isActive ? "active" : "inactive";
    await user.save();

    // Create notification for user
    const notificationMessage = isActive
      ? "Your account has been activated by SuperAdmin. You can now access the system."
      : `Your account has been deactivated by SuperAdmin. ${
          reason ? "Reason: " + reason : ""
        }`;

    await Notification.createNotification({
      type: isActive ? "user_activated" : "user_deactivated",
      recipient: user._id,
      recipientModel: "EximclientUser",
      sender: req.superAdmin.id,
      senderModel: "SuperAdmin",
      title: `Account ${isActive ? "Activated" : "Deactivated"}`,
      message: notificationMessage,
      data: {
        oldStatus,
        newStatus: isActive,
        reason: reason || null,
        updatedBy: "SuperAdmin",
      },
      priority: isActive ? "medium" : "high",
    });

    // Log activity

    res.json({
      success: true,
      message: `User ${isActive ? "activated" : "deactivated"} successfully.`,
      data: {
        userId: user._id,
        oldStatus,
        newStatus: isActive,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Update user status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user status.",
    });
  }
};

/**
 * Assign Modules to User (SuperAdmin)
 */
export const assignModulesToUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { moduleIds } = req.body;

    if (!Array.isArray(moduleIds)) {
      return res.status(400).json({
        success: false,
        message: "Module IDs must be an array.",
      });
    }

    // Find user
    const user = await EximclientUser.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Update user's assigned modules
    user.assignedModules = moduleIds;
    await user.save();

    // Log activity

    res.json({
      success: true,
      message: `Successfully assigned ${moduleIds.length} modules to user.`,
      data: {
        userId: user._id,
        assignedModules: moduleIds,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Assign modules to user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign modules to user.",
    });
  }
};

/**
 * Bulk Assign Modules to Users (SuperAdmin)
 */
export const bulkAssignModulesToUsers = async (req, res) => {
  try {
    const { userIds, moduleIds } = req.body;

    if (!Array.isArray(userIds) || !Array.isArray(moduleIds)) {
      return res.status(400).json({
        success: false,
        message: "User IDs and Module IDs must be arrays.",
      });
    }

    if (userIds.length === 0 || moduleIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one user and one module must be selected.",
      });
    }

    // Find users
    const users = await EximclientUser.find({ _id: { $in: userIds } });
    if (users.length !== userIds.length) {
      return res.status(404).json({
        success: false,
        message: "Some users not found.",
      });
    }

    // Update all users' assigned modules (add new modules to existing ones)
    const bulkOperations = users.map((user) => {
      const existingModules = user.assignedModules || [];
      const newModules = [...new Set([...existingModules, ...moduleIds])]; // Remove duplicates

      return {
        updateOne: {
          filter: { _id: user._id },
          update: { $set: { assignedModules: newModules } },
        },
      };
    });

    await EximclientUser.bulkWrite(bulkOperations);

    // Log activity for each user

    res.json({
      success: true,
      message: `Successfully assigned ${moduleIds.length} modules to ${users.length} users.`,
      data: {
        affectedUsers: users.length,
        assignedModules: moduleIds.length,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Bulk assign modules error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to bulk assign modules.",
    });
  }
};

/* Endpoint to get allowed customers for Gandhidham tab */
export async function getAllowedGandhidhamCustomers(req, res) {
  try {
    const { superadminId } = req.params;
    const superadmin = await SuperAdminModel.findById(superadminId);
    if (!superadmin) {
      return res.status(404).json({ error: "Superadmin not found" });
    }
    res.json({ allowedCustomers: superadmin.allowedCustomers || [] });
  } catch (error) {
    console.error("Error fetching allowed Gandhidham customers:", error);
    res
      .status(500)
      .json({ error: "Error fetching allowed Gandhidham customers" });
  }
}

/* IEcode controller*/

/**
 * Assign IE code to a specific user and set assignedImporterName from CustomerKyc.
 * Can be called by SuperAdmin or Admin (within IE code restrictions).
 */
export const assignIeCodeToUser = async (req, res) => {
  try {
    const actor = req.superAdmin || req.user;
    if (!actor) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const { userId } = req.params;
    const { ieCodeNo, reason } = req.body;

    // Validate required fields
    if (!ieCodeNo) {
      return res.status(400).json({
        success: false,
        message: "IE Code is required.",
      });
    }

    const user = await EximclientUser.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // Security Check for Admins - they can only assign their own IE code to users
    if (actor.role === "admin" && ieCodeNo !== actor.ie_code_no) {
      return res.status(403).json({
        success: false,
        message:
          "Forbidden: Admins can only assign their own IE Code to users.",
      });
    }

    // Check if the IE code exists in the CustomerKyc table and get name_of_individual
    const customerKyc = await CustomerKycModel.findOne({ iec_no: ieCodeNo });
    if (!customerKyc) {
      return res.status(400).json({
        success: false,
        message: `No customer KYC record found with IEC number ${ieCodeNo}.`,
      });
    }

    if (!customerKyc.name_of_individual) {
      return res.status(400).json({
        success: false,
        message: `Customer KYC record found but name_of_individual is missing for IEC ${ieCodeNo}.`,
      });
    }

    // Store previous values for logging
    const previousIeCode = user.ie_code_no;
    const previousImporterName = user.assignedImporterName;

    // Update user's IE code and assigned importer name
    user.ie_code_no = ieCodeNo;
    user.assignedImporterName = customerKyc.name_of_individual; // Use name_of_individual from CustomerKyc
    user.ieCodeAssignedBy = actor.id;
    user.ieCodeAssignedAt = new Date();
    await user.save();

    // Log activity

    console.log(
      `IEC ${ieCodeNo} and Importer ${
        customerKyc.name_of_individual
      } assigned to user ${user.name} by ${actor.role || "superadmin"}`
    );

    res.json({
      success: true,
      message: "IEC and Importer assigned to user successfully.",
      data: {
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        previousIeCode,
        newIeCode: ieCodeNo,
        previousImporterName,
        newImporterName: customerKyc.name_of_individual,
        assignedBy: actor.id,
        assignedAt: user.ieCodeAssignedAt,
      },
    });
  } catch (error) {
    console.error("Assign IE code to user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign IE code to user.",
      error: error.message,
    });
  }
};

/**
 * Bulk assign IE code to multiple users and set assignedImporterName from CustomerKyc.
 * Can be called by SuperAdmin or Admin (within IE code restrictions).
 */
export const bulkAssignIeCodeToUsers = async (req, res) => {
  try {
    const actor = req.superAdmin || req.user;
    if (!actor) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    const { userIds, ieCodeNo, reason } = req.body;

    // Validate required fields
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "userIds must be a non-empty array.",
      });
    }

    if (!ieCodeNo) {
      return res.status(400).json({
        success: false,
        message: "IE Code is required.",
      });
    }

    // Security Check for Admins - they can only assign their own IE code
    if (actor.role === "admin" && ieCodeNo !== actor.ie_code_no) {
      return res.status(403).json({
        success: false,
        message:
          "Forbidden: Admins can only assign their own IE Code to users.",
      });
    }

    // Check if the IE code exists in CustomerKyc and get name_of_individual
    const customerKyc = await CustomerKycModel.findOne({ iec_no: ieCodeNo });
    if (!customerKyc) {
      return res.status(400).json({
        success: false,
        message: `No customer KYC record found with IEC number ${ieCodeNo}.`,
      });
    }

    if (!customerKyc.name_of_individual) {
      return res.status(400).json({
        success: false,
        message: `Customer KYC record found but name_of_individual is missing for IEC ${ieCodeNo}.`,
      });
    }

    // Update multiple users with IE code and importer name
    const result = await EximclientUser.updateMany(
      { _id: { $in: userIds } },
      {
        ie_code_no: ieCodeNo,
        assignedImporterName: customerKyc.name_of_individual, // Use name_of_individual from CustomerKyc
        ieCodeAssignedBy: actor.id,
        ieCodeAssignedAt: new Date(),
      }
    );

    // Get updated users for notification
    const updatedUsers = await EximclientUser.find({
      _id: { $in: userIds },
    }).select("_id name email");

    // Create notifications for all users
    const notifications = updatedUsers.map((user) => ({
      type: "ie_code_assigned",
      recipient: user._id,
      recipientModel: "EximclientUser",
      sender: actor.id,
      senderModel:
        actor.role === "superadmin" ? "SuperAdmin" : "EximclientUser",
      title: "IE Code and Importer Assigned",
      message: `Your account has been assigned IEC: ${ieCodeNo} and Importer: ${
        customerKyc.name_of_individual
      }. ${reason ? "Reason: " + reason : ""}`,
    }));

    // Bulk create notifications
    await Notification.insertMany(notifications);

    // Log activity

    console.log(
      `Bulk IEC assignment: ${ieCodeNo} and Importer ${
        customerKyc.name_of_individual
      } assigned to ${result.modifiedCount} users by ${
        actor.role || "superadmin"
      }`
    );

    res.json({
      success: true,
      message: `IEC and Importer assigned to ${result.modifiedCount} users successfully.`,
      data: {
        ieCodeNo,
        importerName: customerKyc.name_of_individual,
        modifiedCount: result.modifiedCount,
        assignedBy: actor.id,
        assignedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Bulk assign IE code error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to bulk assign IE code to users.",
      error: error.message,
    });
  }
};

/**
 * Get all available IEC codes with their corresponding importer names
 * Can be called by SuperAdmin or Admin (within IE code restrictions)
 */
export const getAvailableIecCodes = async (req, res) => {
  try {
    const actor = req.superAdmin || req.user;
    if (!actor) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required." });
    }

    // Build query based on user role
    let query = { iec_no: { $exists: true, $ne: null, $ne: "" } };

    // Security Check for Admins - can only see their own IEC code
    if (actor.role === "admin") {
      query.iec_no = actor.ie_code_no;
    }

    // Add search functionality
    const { search } = req.query;
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { iec_no: searchRegex },
        { name_of_individual: searchRegex },
      ];
    }

    const iecCodes = await CustomerKycModel.find(query)
      .select("iec_no name_of_individual status approval")
      .sort({ name_of_individual: 1 });

    const formattedData = iecCodes.map((kyc) => ({
      iecNo: kyc.iec_no,
      importerName: kyc.name_of_individual,
      status: kyc.status,
      approval: kyc.approval,
      id: kyc._id,
    }));

    res.json({
      success: true,
      data: formattedData,
      message: `Found ${formattedData.length} IEC codes`,
    });
  } catch (error) {
    console.error("Get available IEC codes error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get available IEC codes.",
      error: error.message,
    });
  }
};
