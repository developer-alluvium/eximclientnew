import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import CustomerModel from "../models/customerModel.js";
import EximclientUser from "../models/eximclientUserModel.js";
import AdminModel from "../models/adminModel.js";
import SuperAdminModel from "../models/superAdminModel.js";
import ActivityLogModel from "../models/ActivityLogModel.js";

// Initialize environment variables
dotenv.config();

// Constants for JWT settings
const ACCESS_TOKEN_SECRET =
  process.env.JWT_SECRET || "your-access-token-secret";
const REFRESH_TOKEN_SECRET =
  process.env.JWT_REFRESH_SECRET || "your-refresh-token-secret";
const ACCESS_TOKEN_EXPIRES = process.env.JWT_EXPIRATION || "12h";
const REFRESH_TOKEN_EXPIRES = process.env.JWT_REFRESH_EXPIRATION || "7d";

/**
 * Generate access token for a user
 * @param {Object} user - User object with required properties
 * @returns {String} JWT token
 */
export const generateToken = (user) => {
  // Determine if the user is a SuperAdmin
  const isSuperAdmin = user.constructor.modelName === "SuperAdmin";

  return jwt.sign(
    {
      id: user._id,
      ie_code_assignments: !isSuperAdmin
        ? user.ie_code_assignments || [
            {
              ie_code_no: user.ie_code_no,
              importer_name: user.assignedImporterName,
              assigned_at: user.ieCodeAssignedAt || new Date(),
              is_primary: true,
            },
          ]
        : undefined,
      primary_ie_code: !isSuperAdmin ? user.ie_code_no : undefined,
      name: user.name,
      role: isSuperAdmin ? "superadmin" : user.role || "customer",
      userType: isSuperAdmin ? "superadmin" : "user",
      has_multiple_ie_codes:
        !isSuperAdmin &&
        Array.isArray(user.ie_code_assignments) &&
        user.ie_code_assignments.length > 0,
    },
    ACCESS_TOKEN_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRES,
      algorithm: "HS256",
    }
  );
};

/**
 * Generate refresh token for a user
 * @param {Object} user - User object with required properties
 * @returns {String} JWT refresh token
 */
export const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      ie_code_assignments: user.ie_code_assignments || [
        {
          ie_code_no: user.ie_code_no,
          importer_name: user.assignedImporterName,
          assigned_at: user.ieCodeAssignedAt || new Date(),
          is_primary: true,
        },
      ],
      primary_ie_code: user.ie_code_no,
      role: user.role,
      has_multiple_ie_codes:
        Array.isArray(user.ie_code_assignments) &&
        user.ie_code_assignments.length > 0,
    },
    REFRESH_TOKEN_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRES,
    }
  );
};

/**
 * Generate short-lived SSO token for E-Lock redirection
 * @param {Object} user - User object with ie_code_no
 * @returns {String} JWT token for SSO
 */
export const generateSSOToken = (user) => {
  return jwt.sign(
    {
      sub: user._id || user.id, // Standard JWT subject field
      ie_code_no: user.primary_ie_code || user.ie_code_no, // Primary IE code for backward compatibility
      ie_code_assignments: user.ie_code_assignments || [
        {
          ie_code_no: user.ie_code_no,
          importer_name: user.assignedImporterName,
          assigned_at: user.ieCodeAssignedAt || new Date(),
          is_primary: true,
        },
      ],
      name: user.name,
      has_multiple_ie_codes:
        Array.isArray(user.ie_code_assignments) &&
        user.ie_code_assignments.length > 0,
      // exp and iat are automatically added by jwt.sign()
    },
    ACCESS_TOKEN_SECRET,
    {
      expiresIn: "1d", // 1 day expiry for security
      algorithm: "HS256",
    }
  );
};

/**
 * Send tokens via cookies and optionally in response body
 * @param {Object} user - User object
 * @param {Number} statusCode - HTTP status code
 * @param {Object} res - Express response object
 * @param {Boolean} includeTokens - Whether to include tokens in response body
 */
export const createSendTokens = (
  user,
  statusCode,
  res,
  includeTokens = false
) => {
  // Generate tokens
  const accessToken = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  // Cookie options for HTTP environments
  const cookieOptions = {
    httpOnly: true,
    secure: false, // Set to false for HTTP environments (both dev and production)
    sameSite: "lax", // Changed from "strict" to "lax" for better HTTP compatibility
  };

  // Set access token cookie
  res.cookie("access_token", accessToken, {
    ...cookieOptions,
    expires: new Date(
      Date.now() +
        (process.env.JWT_COOKIE_EXPIRES_IN
          ? parseInt(process.env.JWT_COOKIE_EXPIRES_IN) * 60 * 60 * 1000
          : 24 * 60 * 60 * 1000)
    ),
  });

  // Set refresh token cookie
  res.cookie("refresh_token", refreshToken, {
    ...cookieOptions,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  // Sanitize user data for response
  const userData = sanitizeUserData(user);

  // Create response object
  const responseData = {
    success: true,
    message: "Authentication successful",
    data: { user: userData },
  };

  // Include tokens in response body if requested
  if (includeTokens) {
    responseData.accessToken = accessToken;
    responseData.refreshToken = refreshToken;
  }

  // Send response
  res.status(statusCode).json(responseData);
};

//* Authentication middleware that verifies JWT in cookie or Authorization header
export const authenticate = async (req, res, next) => {
  try {
    // Get token from various sources - check different user type cookies
    const token =
      (req.cookies && req.cookies.access_token) ||
      (req.cookies && req.cookies.customer_admin_access_token) ||
      (req.cookies && req.cookies.user_access_token) ||
      (req.headers.authorization && req.headers.authorization.split(" ")[1]) ||
      (req.headers.authorization &&
        req.headers.authorization.replace("Bearer ", ""));

    if (!token) {
      // Log only specific routes or in debug mode to reduce log noise
      if (process.env.NODE_ENV === "development" && process.env.DEBUG_AUTH) {
        console.log("No token provided for protected route:", req.path);
        console.log("Cookies:", req.cookies);
        console.log("Authorization header:", req.headers.authorization);
      }
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);

    // Try to find the user in different models based on their role
    let user = null;
    let userType = decoded.role;

  

    // First try SuperAdmin model for superadmin role
    if (userType === "superadmin") {
      user = await SuperAdminModel.findById(decoded.id);
      if (user) userType = "superadmin";
    }

    // If not found or not superadmin, try EximclientUser model
    if (!user) {
      user = await EximclientUser.findById(decoded.id);
      if (user) {
        // For EximclientUser, determine if they're admin or regular user
        userType = user.role === "admin" ? "admin" : "user";
      }
    }

    if (!user) {
      console.log(
        `User with ID ${decoded.id} not found in ${userType} collection`
      );
      return res.status(401).json({
        success: false,
        message: "Authentication failed. User not found.",
      });
    }

    // Check if user is active (for non-superadmin users)
    if (userType !== "superadmin" && !user.isActive) {
      console.log(`User account is inactive: ${decoded.id}`);
      return res.status(401).json({
        success: false,
        message: "Authentication failed. Account is inactive.",
      });
    }

    // Store sanitized user information in request object
    req.user = {
      id: user._id,
      ie_code_assignments:
        userType !== "superadmin"
          ? user.ie_code_assignments || [
              {
                ie_code_no: user.ie_code_no,
                importer_name: user.assignedImporterName,
              },
            ]
          : [],
      name: user.name,
      role: userType, // Use the determined userType as role
      isActive: user.isActive,
      assignedModules: user.assignedModules || [],
      email: user.email,
      _id: user._id, // Include both id and _id for compatibility
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    } else if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    console.error("Authentication middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Authentication failed",
      error: error.message,
    });
  }
};
//* Middleware to refresh access token using refresh token

export const refreshAccessToken = async (req, res) => {
  try {
    // Get refresh token from cookie or request body
    const refreshToken = req.cookies.refresh_token || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "No refresh token provided",
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

    // Find customer
    const customer = await CustomerModel.findById(decoded.id);

    if (!customer || !customer.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token or user inactive",
      });
    }

    // Generate new access token
    const accessToken = generateToken(customer);

    // Set new access token in cookie
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: false, // HTTP compatibility
      sameSite: "lax", // HTTP compatibility
      expires: new Date(
        Date.now() +
          (process.env.JWT_COOKIE_EXPIRES_IN
            ? parseInt(process.env.JWT_COOKIE_EXPIRES_IN) * 60 * 60 * 1000
            : 24 * 60 * 60 * 1000)
      ),
    });

    // Send response
    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      accessToken,
    });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    } else if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Refresh token expired, please log in again",
      });
    }

    res.status(500).json({
      success: false,
      message: "Token refresh failed",
      error: error.message,
    });
  }
};

/**
 * Role-based authorization middleware
 * @param {...String} allowedRoles - Allowed roles for the route
//  */
// export const authorizeRoles = (...allowedRoles) => {
//   return (req, res, next) => {
//     if (!req.user || !allowedRoles.includes(req.user.role)) {
//       return res.status(403).json({
//         success: false,
//         message:
//           "Access denied. You do not have permission to perform this action.",
//       });
//     }
//     next();
//   };
// };

/**
 * Logout function to clear auth cookies
 */
export const logout = (req, res) => {
  res.cookie("access_token", "logged-out", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.cookie("refresh_token", "logged-out", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

/**
  Sanitized user object
 */
export const sanitizeUserData = (user) => {
  // Basic fields always included
  const sanitized = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role || "user",
    isActive: user.isActive || false,
    ie_code_assignments:
      user.ie_code_assignments ||
      (user.ie_code_no
        ? [
            {
              ie_code_no: user.ie_code_no,
              importer_name: user.assignedImporterName,
              assigned_at: user.ieCodeAssignedAt || new Date(),
              is_primary: true,
            },
          ]
        : []),
    primary_ie_code: user.ie_code_no, // Primary IE code for compatibility
    ie_code_no: user.ie_code_no, // Keep for backward compatibility
    has_multiple_ie_codes:
      Array.isArray(user.ie_code_assignments) &&
      user.ie_code_assignments.length > 0,
    role: user.role || "user",
    isActive: user.isActive,
    lastLogin: user.lastLogin,
    documents: user.documents,
  };

  // Additional fields if they exist in the user object
  const additionalFields = [
    "username",
    "email",
    "first_name",
    "middle_name",
    "last_name",
    "company",
    "employee_photo",
    "designation",
    "department",
    "employment_type",
    "assigned_importer",
    "assignedImporterName",
    "jobsTabVisible",
    "gandhidhamTabVisible",
    "modules",
    "assignedModules",
    "isAdmin", // Added isAdmin field
    "emailVerified",
    "documents",
  ];

  additionalFields.forEach((field) => {
    if (user[field] !== undefined) {
      sanitized[field] = user[field];
    }
  });

  // Add tab visibility fields
  if (user.jobsTabVisible !== undefined)
    sanitized.jobsTabVisible = user.jobsTabVisible;
  if (user.gandhidhamTabVisible !== undefined)
    sanitized.gandhidhamTabVisible = user.gandhidhamTabVisible;

  return sanitized;
};

/**
 * Generate access token for new user system
 * @param {Object} user - User object with required properties
 * @param {String} userType - Type of user (user, admin, superadmin)
 * @returns {String} JWT token
 */
export const generateUserToken = (user, userType = "user") => {
  const payload = {
    id: user._id,
    email: user.email,
    name: user.name,
    userType: userType,
    role: userType,
    isAdmin: user.isAdmin,
  };

  // Add specific fields based on user type
  if (userType === "user" || userType === "admin") {
    payload.ie_code_no = user.ie_code_no;
  }

  if (userType === "user") {
    payload.status = user.status;
    payload.adminId = user.adminId;
  }

  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES,
    algorithm: "HS256",
  });
};

/**
 * Authentication middleware for new user system
 */
export const authenticateUser = async (req, res, next) => {
  try {
    // Get token from cookie or Authorization header
    const token =
      (req.cookies && req.cookies.user_access_token) ||
      (req.headers.authorization && req.headers.authorization.split(" ")[1]);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);

    // Get user based on type
    let user;
    switch (decoded.userType) {
      case "user":
        user = await EximclientUser.findById(decoded.id).populate(
          "adminId",
          "name email ie_code_no"
        );
        break;
      case "admin":
        user = await AdminModel.findById(decoded.id);
        break;
      case "superadmin":
        user = await SuperAdminModel.findById(decoded.id);
        break;
      default:
        return res.status(401).json({
          success: false,
          message: "Invalid user type.",
        });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token. User not found.",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is inactive. Please contact support.",
      });
    }

    // For users, check if they're verified
    if (decoded.userType === "user" && user.status === "pending") {
      return res.status(403).json({
        success: false,
        message:
          "Account pending verification. Please wait for admin approval.",
      });
    }

    // Attach user to request
    req.user = user;
    req.userType = decoded.userType;

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
      });
    }

    console.error("Authentication error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication.",
    });
  }
};

/**
 * Authorization middleware to check user roles
 */
// export const authorize = (...roles) => {
//   return (req, res, next) => {
//     if (!req.user || !req.userType) {
//       return res.status(401).json({
//         success: false,
//         message: "Authentication required.",
//       });
//     }

//     if (!roles.includes(req.user.role) ) {
//       return res.status(403).json({
//         success: false,
//         message: "Insufficient permissions.",
//       });
//     }

//     next();
//   };
// };
// In your authMiddleware.js

// Helper function to check if a user has access to a specific IE code
export const hasIECodeAccess = (user, ieCodeNo) => {
  if (!user || !ieCodeNo) return false;

  // For superadmin role, always allow access
  if (user.role === "superadmin") return true;

  // Check in ie_code_assignments array
  if (user.ie_code_assignments?.length > 0) {
    return user.ie_code_assignments.some(
      (assignment) => assignment.ie_code_no === ieCodeNo.toUpperCase()
    );
  }

  // Fallback for legacy data
  return user.ie_code_no === ieCodeNo.toUpperCase();
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || Object.keys(req.user).length === 0) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const userPermission = req.user.role || req.userType;

    if (!userPermission) {
      return res.status(403).json({
        success: false,
        message: "Permission property not found on user object.",
      });
    }

    // THIS IS THE FIX: Only check for roles if the 'roles' array is not empty.
    // If roles is empty, it means any authenticated user is allowed.
    if (roles.length > 0 && !roles.includes(userPermission)) {
      return res.status(403).json({
        success: false,
        message: `Insufficient permissions. Access denied for role: '${userPermission}'.`,
      });
    }

    next();
  };
};
/**
 * Middleware to check IE code access
 */
export const checkIECodeAccess = async (req, res, next) => {
  try {
    if (!req.user || !req.userType) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    // SuperAdmin has access to all IE codes
    if (req.userType === "superadmin") {
      return next();
    }

    // Get IE code from request (params, body, or query)
    const targetIECode =
      req.params.ie_code_no || req.body.ie_code_no || req.query.ie_code_no;

    if (!targetIECode) {
      return res.status(400).json({
        success: false,
        message: "IE code is required.",
      });
    }

    // Check if user has access to this IE code
    const hasAccess =
      req.user.ie_code_assignments?.some(
        (assignment) => assignment.ie_code_no === targetIECode.toUpperCase()
      ) || req.user.ie_code_no === targetIECode.toUpperCase(); // Fallback for legacy data

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You don't have permission for this IE code.",
      });
    }

    next();
  } catch (error) {
    console.error("IE code access check error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during authorization.",
    });
  }
};

/**
 * Send authentication response for new user system
 */
export const sendUserAuthResponse = (
  user,
  userType,
  statusCode,
  res,
  includeTokens = false
) => {
  const accessToken = generateUserToken(user, userType);
  const refreshToken = generateRefreshToken(user);

  // Cookie options
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  };

  // Set access token cookie with user-specific name
  res.cookie(`${userType}_access_token`, accessToken, {
    ...cookieOptions,
    expires: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
  });

  // Set refresh token cookie
  res.cookie(`${userType}_refresh_token`, refreshToken, {
    ...cookieOptions,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });

  // Sanitize user data for response
  const userData = sanitizeUserData(user);

  // Create response object
  const responseData = {
    success: true,
    message: "Authentication successful",
    userType: userType,
    data: { user: userData },
  };

  // Include tokens in response body if requested
  if (includeTokens) {
    responseData.accessToken = accessToken;
    responseData.refreshToken = refreshToken;
  }

  // Send response
  res.status(statusCode).json(responseData);
};
