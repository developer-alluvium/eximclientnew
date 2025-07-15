import SuperAdminModel from "../models/superAdminModel.js";
import jwt from "jsonwebtoken";

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || "12h";

/**
 * SuperAdmin Login
 */
export const superAdminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log(`SuperAdmin login attempt for username: ${username}`);

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide username and password",
      });
    }

    // Find superadmin by username
    const superAdmin = await SuperAdminModel.findOne({ username });

    if (!superAdmin) {
      console.log(`SuperAdmin with username ${username} not found`);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if account is locked
    if (superAdmin.isLocked()) {
      console.log(`SuperAdmin account ${username} is locked`);
      return res.status(423).json({
        success: false,
        message: "Account is temporarily locked due to too many failed login attempts. Please try again later.",
      });
    }

    // Check if account is active
    if (!superAdmin.isActive) {
      console.log(`SuperAdmin account ${username} is inactive`);
      return res.status(401).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    // Verify password
    const isPasswordCorrect = await superAdmin.comparePassword(password);

    if (!isPasswordCorrect) {
      console.log(`Invalid password for SuperAdmin ${username}`);
      
      // Increment login attempts
      await superAdmin.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Reset login attempts on successful login
    await superAdmin.resetLoginAttempts();

    // Generate JWT token with superadmin role
    const token = jwt.sign(
      { 
        id: superAdmin._id, 
        username: superAdmin.username,
        role: "superadmin"
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );

    console.log(`SuperAdmin ${username} logged in successfully`);

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
        role: "superadmin"
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
    const superAdmin = await SuperAdminModel.findById(req.superAdmin.id).select('-password');
    
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
        role: "superadmin"
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
    console.log(`Token verified for SuperAdmin ID: ${decoded.id}`);

    // Check if user has superadmin role
    if (decoded.role !== "superadmin") {
      console.log(`Insufficient privileges. Role: ${decoded.role}`);
      return res.status(403).json({
        success: false,
        message: "Access denied. SuperAdmin privileges required.",
      });
    }

    // Find superadmin by ID
    const superAdmin = await SuperAdminModel.findById(decoded.id);

    if (!superAdmin) {
      console.log(`SuperAdmin with ID ${decoded.id} not found`);
      return res.status(401).json({
        success: false,
        message: "SuperAdmin not found",
      });
    }

    // Check if superadmin is active
    if (!superAdmin.isActive) {
      console.log(`SuperAdmin account is inactive: ${decoded.id}`);
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
    };

    next();
  } catch (error) {
    console.error("SuperAdmin auth middleware error:", error);
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
        message: "SuperAdmin already exists. This endpoint is only for initial setup.",
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
