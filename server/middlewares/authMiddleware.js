import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import CustomerModel from "../models/customerModel.js";
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
  return jwt.sign(
    {
      id: user._id,
      ie_code_no: user.ie_code_no,
      name: user.name,
      role: user.role || "customer",
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
      ie_code_no: user.ie_code_no,
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
      ie_code_no: user.ie_code_no,
      name: user.name
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
    // Get token from cookie or Authorization header
    const token =
      (req.cookies && req.cookies.access_token) ||
      (req.headers.authorization && req.headers.authorization.split(" ")[1]);

    if (!token) {
      // Log only specific routes or in debug mode to reduce log noise
      if (process.env.NODE_ENV === 'development' && process.env.DEBUG_AUTH) {
        console.log("No token provided for protected route:", req.path);
      }
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);

    // Find customer by ID
    const customer = await CustomerModel.findById(decoded.id);

    if (!customer) {
      console.log(`Customer with ID ${decoded.id} not found`);
      return res.status(401).json({
        success: false,
        message: "Authentication failed. User not found.",
      });
    }

    // Check if customer is active
    if (!customer.isActive) {
      console.log(`Customer account is inactive: ${decoded.id}`);
      return res.status(401).json({
        success: false,
        message: "Authentication failed. Account is inactive.",
      });
    }

    // Add user information to request object
    req.user = {
      id: customer._id,
      ie_code_no: customer.ie_code_no,
      name: customer.name,
      role: decoded.role || "customer",
      isActive: customer.isActive,
      assignedModules: customer.assignedModules || [],
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
    ie_code_no: user.ie_code_no,
    role: user.role || "customer",
    isActive: user.isActive,
    lastLogin: user.lastLogin,
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
    "assigned_importer_name",
    "modules",
    "assignedModules",
  ];

  additionalFields.forEach((field) => {
    if (user[field] !== undefined) {
      sanitized[field] = user[field];
    }
  });

  return sanitized;
};
