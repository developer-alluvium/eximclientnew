import CustomerModel from "../models/customerModel.js";
import EximclientUser from "../models/eximclientUserModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import JobModel from "../models/jobModel.js";
import CustomerKycModel from "../models/customerKycModel.js";
import ActivityLogModel from "../models/ActivityLogModel.js";
import { createSendTokens } from "../middlewares/authMiddleware.js";
// Comment out missing email utility
// import { sendEmail } from "../utils/email.js";

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || "12h";

//* LOGIN

export const login = async (req, res) => {
  try {
    const { ie_code_no, password } = req.body;

    console.log(`Login attempt with IE code: ${ie_code_no}`);

    // Validate input
    if (!ie_code_no || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide IE code and password",
      });
    }

    // Step 1: First check if customer already exists
    let customer = await CustomerModel.findOne({ ie_code_no });

    // If customer doesn't exist, we need to set it up
    if (!customer) {
      console.log(
        `Customer with IE code ${ie_code_no} not found, attempting to create`
      );

      // Find the job with this IE code
      const job = await JobModel.findOne({ ie_code_no });
      if (!job) {
        console.log(`Job with IE code ${ie_code_no} not found`);
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Find matching CustomerKYC entry
      const customerKYC = await CustomerKycModel.findOne({
        $or: [{ iec_no: ie_code_no }, { name_of_individual: job.importer }],
      });

      if (!customerKYC) {
        console.log(
          `CustomerKYC for ${ie_code_no} or ${job.importer} not found`
        );
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Create new customer
      customer = new CustomerModel({
        name: job.importer,
        ie_code_id: job._id,
        ie_code_no: ie_code_no,
        pan_id: customerKYC._id,
        pan_number: customerKYC.pan_no,
        isActive: true,
      });

      // Generate and set initial password
      const generatedPassword = customer.generatePassword();
      console.log(`Generated initial password for new customer`);

      // Check if provided password matches the generated one
      if (password !== generatedPassword) {
        console.log(`Password mismatch for new customer`);
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }      // Since the password matches, save the customer with plain text password
      // The pre-save hook will hash it automatically
      customer.password = password;
      customer.initialPassword = password; // Store plain text for admin viewing
      customer.lastLogin = new Date();
      await customer.save();

      console.log(`New customer created with IE code: ${ie_code_no}`);    } else {
      // Existing customer - verify password using the schema method
      console.log(`Customer found, verifying password`);      console.log(`Current stored password hash starts with: ${customer.password.substring(0, 10)}...`);
      console.log(`Customer password_changed status: ${customer.password_changed}`);
      
      const isPasswordCorrect = await customer.comparePassword(password);
      console.log(`Password comparison result: ${isPasswordCorrect}`);

      if (!isPasswordCorrect) {
        // Only allow generated password login if the user hasn't changed their password
        if (!customer.password_changed) {
          // If password doesn't match stored hash, check if it matches the generated one
          // This handles cases where customer exists but password might have been reset
          const generatedPassword = customer.generatePassword();
          console.log(`Generated password for comparison: ${generatedPassword}`);
          console.log(`Provided password: ${password}`);

          if (password === generatedPassword) {
            // If matches generated password, update the stored hash
            console.log(
              `Password matches generated password pattern, updating hash`
            );
            const oldPasswordHash = customer.password;
            customer.password = password; // Set plain text, pre-save hook will hash it
            customer.initialPassword = password; // Store for admin viewing
            customer.password_changed = false; // Mark as default password
            
            console.log(`Before save - password field: ${customer.password}`);
            await customer.save();
            console.log(`After save - new password hash starts with: ${customer.password.substring(0, 10)}...`);
            console.log(`Old hash: ${oldPasswordHash.substring(0, 10)}..., New hash: ${customer.password.substring(0, 10)}...`);
          } else {
            console.log(`Password verification failed - neither stored hash nor generated password match`);
            
            // Log failed login attempt
            try {
              const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
              const userAgent = req.headers['user-agent'] || 'Unknown';
              
              await ActivityLogModel.create({
                user_id: customer._id,
                user_email: customer.email || `${customer.ie_code_no}@example.com`,
                user_name: customer.name,
                ie_code_no: customer.ie_code_no,
                activity_type: 'failed_login',
                description: 'Failed login attempt - password verification failed',
                ip_address: ipAddress,
                user_agent: userAgent,
                severity: 'medium',
                is_suspicious: true,
                details: {
                  reason: 'password_verification_failed',
                  ie_code_no: ie_code_no
                }
              });
            } catch (activityError) {
              console.error('Error logging failed login activity:', activityError);
            }
            
            return res.status(401).json({
              success: false,
              message: "Invalid credentials",
            });
          }        } else {
          // User has changed their password, only accept the stored password
          console.log(`User has custom password, but provided password doesn't match stored hash`);
          
          // Log failed login attempt
          try {
            const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
            const userAgent = req.headers['user-agent'] || 'Unknown';
            
            await ActivityLogModel.create({
              user_id: customer._id,
              user_email: customer.email || `${customer.ie_code_no}@example.com`,
              user_name: customer.name,
              ie_code_no: customer.ie_code_no,
              activity_type: 'failed_login',
              description: 'Failed login attempt - incorrect password for changed account',
              ip_address: ipAddress,
              user_agent: userAgent,
              severity: 'high',
              is_suspicious: true,
              details: {
                reason: 'incorrect_password_changed_account',
                ie_code_no: ie_code_no
              }
            });
          } catch (activityError) {
            console.error('Error logging failed login activity:', activityError);
          }
          
          return res.status(401).json({
            success: false,
            message: "Invalid credentials",
          });
        }
      }    // Update last login
    customer.lastLogin = new Date();
    await customer.save();
    console.log(`Login timestamp updated for customer`);

    // Log successful login activity
    try {
      const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
      const userAgent = req.headers['user-agent'] || 'Unknown';
      
      await ActivityLogModel.create({
        user_id: customer._id,
        user_email: customer.email || `${customer.ie_code_no}@example.com`,
        user_name: customer.name,
        ie_code_no: customer.ie_code_no,
        activity_type: 'login',
        description: 'User logged in successfully',
        ip_address: ipAddress,
        user_agent: userAgent,
        severity: 'low',
        details: {
          login_method: 'password',
          success: true
        }
      });
    } catch (activityError) {
      console.error('Error logging login activity:', activityError);
      // Continue with login even if activity logging fails
    }
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: customer._id, ie_code_no: customer.ie_code_no },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );

    createSendTokens(customer, 200, res, true);

    // Send successful response
    // res.status(200).json({
    //   success: true,
    //   //token, // Added token back to response
    //   name: customer.name,
    //   id: customer._id,
    //   ie_code_no: customer.ie_code_no,
    //   lastLogin: customer.lastLogin,
    // });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during login",
      error: error.message,
    });
  }
};

// Logout controller

// export const logout = async (req, res) => {
//   try {
//     // Try to log logout activity and update last logout time if user info is available
//     if (req.user || req.body.user_id) {
//       try {
//         const userId = req.user?.id || req.body.user_id;
//         const customer = await CustomerModel.findById(userId);
        
//         if (customer) {
//           // Update last logout time
//           customer.lastLogout = new Date();
//           await customer.save();
          
//           const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
//           const userAgent = req.headers['user-agent'] || 'Unknown';
          
//           await ActivityLogModel.create({
//             user_id: customer._id,
//             user_email: customer.email || `${customer.ie_code_no}@example.com`,
//             user_name: customer.name,
//             ie_code_no: customer.ie_code_no,
//             activity_type: 'logout',
//             description: 'User logged out successfully',
//             ip_address: ipAddress,
//             user_agent: userAgent,
//             severity: 'low',
//             details: {
//               logout_method: 'manual',
//               logout_time: new Date().toISOString()
//             }
//           });
//         }
//       } catch (activityError) {
//         console.error('Error logging logout activity:', activityError);
//         // Continue with logout even if activity logging fails
//       }
//     }

//     // Clear authentication cookies
//     res.clearCookie('access_token');
//     res.clearCookie('refresh_token');

//     res.status(200).json({
//       success: true,
//       message: "Logged out successfully",
//     });
//   } catch (error) {
//     console.error("Logout error:", error);
//     res.status(500).json({
//       success: false,
//       message: "An error occurred during logout",
//       error: error.message,
//     });
//   }
// };

/**
 * Forgot password controller
 * Regenerates the password based on IE code and PAN number
 */
export const forgotPassword = async (req, res) => {
  try {
    const { ie_code_no } = req.body;

    console.log(`Forgot password attempt for IE code: ${ie_code_no}`);

    // Validate input
    if (!ie_code_no) {
      return res.status(400).json({
        success: false,
        message: "Please provide IE code",
      });
    }

    // Find customer by IE code
    const customer = await CustomerModel.findOne({ ie_code_no });

    if (!customer) {
      console.log(`Customer with IE code ${ie_code_no} not found`);

      // Try to create a new customer if possible (similar to login flow)
      const job = await JobModel.findOne({ ie_code_no });
      if (!job) {
        console.log(`Job with IE code ${ie_code_no} not found`);
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      // Find matching CustomerKYC entry
      const customerKYC = await CustomerKycModel.findOne({
        $or: [{ iec_no: ie_code_no }, { name_of_individual: job.importer }],
      });

      if (!customerKYC) {
        console.log(
          `CustomerKYC for ${ie_code_no} or ${job.importer} not found`
        );
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      // Create new customer
      const newCustomer = new CustomerModel({
        name: job.importer,
        ie_code_id: job._id,
        ie_code_no: ie_code_no,
        pan_id: customerKYC._id,
        pan_number: customerKYC.pan_no,
        isActive: true,
      });      // Generate and set initial password
      const generatedPassword = newCustomer.generatePassword();
      newCustomer.password = generatedPassword; // Set plain text, pre-save hook will hash it
      await newCustomer.save();

      console.log(`New customer created with IE code: ${ie_code_no}`);

      return res.status(200).json({
        success: true,
        message: "Account created successfully",
        temporaryPassword: generatedPassword,
      });
    }

    // Generate a new password using the method in the schema
    const newPassword = customer.generatePassword();

    // Set the plain text password - the pre-save hook will hash it
    customer.password = newPassword;
    customer.initialPassword = newPassword; // Store for admin viewing
    customer.password_changed = false; // Reset to default password
    await customer.save();

    console.log(`Password reset successfully for IE code: ${ie_code_no}`);

    // Always return password since email functionality is commented out
    res.status(200).json({
      success: true,
      message: "Password reset successfully.",
      temporaryPassword: newPassword,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during password reset",
      error: error.message,
    });
  }
};

/**
 * Register/Create Customer controller
 * Creates a new customer with IE code and PAN details
 */


/**
 * Middleware to protect routes
 * Verifies JWT token and sets req.user
 */
export const protect = async (req, res, next) => {
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
      console.log("No token provided for protected route");
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log(`Token verified for user ID: ${decoded.id}`);

    // Find customer by ID
    const customer = await CustomerModel.findById(decoded.id);

    if (!customer) {
      console.log(`Customer with ID ${decoded.id} not found`);
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if customer is active
    if (!customer.isActive) {
      console.log(`Customer account is inactive: ${decoded.id}`);
      return res.status(401).json({
        success: false,
        message: "Account is inactive",
      });
    }

    // Set user in request
    req.user = {
      id: customer._id,
      ie_code_no: customer.ie_code_no,
      name: customer.name,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({
      success: false,
      message: "Not authorized to access this route",
      error: error.message,
    });
  }
};

export const postColumnOrder = async (req, res) => {
  try {
    const { userId, columnOrder } = req.body;

    if (!userId || !columnOrder) {
      return res.status(400).json({ error: "Missing userId or columnOrder" });
    }

    // Try to update in CustomerModel first
    let user = await CustomerModel.findByIdAndUpdate(userId, { columnOrder });

    // If not found, try EximclientUser
    if (!user) {
      user = await EximclientUser.findByIdAndUpdate(userId, { columnOrder });
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "Column order saved successfully" });
  } catch (err) {
    console.error("Error saving column order:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getColumnOrder = async (req, res) => {
  try {
    const { userId } = req.query;
    console.log("User ID received:", userId);
    
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    // First try to find by ID in CustomerModel
    let user = await CustomerModel.findById(userId);
    
    // If not found in CustomerModel, try EximclientUser
    if (!user) {
      user = await EximclientUser.findById(userId);
    }

    // If still not found, try to find by name or IE code (fallback for localStorage mismatch)
    // primarily for CustomerModel legacy behavior
    if (!user) {
     // console.log("Attempting to find user by alternative methods...");
      
      // Try to find any user (since there's only 1 in collection based on debug info)
      // This part is preserved but should be used with caution
      user = await CustomerModel.findOne({});
      //console.log("Found any user:", user ? "Yes" : "No");
      
      // if (user) {
      //   console.log(`Found user: ${user.name} with ID: ${user._id}`);
      //   console.log("Note: User ID mismatch detected. Consider updating localStorage.");
      // }
    }
    
    if (!user) {
      return res.status(404).json({ 
        error: "User not found",
        suggestion: "Please logout and login again to refresh your session"
      });
    }
   
    res.json({ 
      columnOrder: user.columnOrder || [],
      allowedColumns: user.allowedColumns || [], // Send allowed columns
      userInfo: {
        id: user._id,
        name: user.name,
        ie_code_no: user.ie_code_no
      }
    });
  } catch (err) {
    console.error("Error in getColumnOrder:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
};



//* SESSION VALIDATION
// export const validateSession = async (req, res) => {
//   try {
//     if (req.user && req.user.id) {
//       // Fetch full customer details
//       const customer = await CustomerModel.findById(req.user.id).lean();
//       if (!customer) {
//         return res.status(401).json({
//           success: false,
//           message: "Session invalid"
//         });
//       }
//       console.log('customer----------------------------------------', customer);
//       return res.status(200).json({
//         success: true,
//         message: "Session valid",
//         user: {
//           id: customer._id,
//           name: customer.name,
//           ie_code_no: customer.ie_code_no,
//           isActive: customer.isActive,
//           assignedModules: customer.assignedModules || []
//         }
//       });
//     } else {
//       return res.status(401).json({
//         success: false,
//         message: "Session invalid"
//       });
//     }
//   } catch (error) {
//     console.error("Session validation error:", error);  
//     return res.status(500).json({
//       success: false,
//       message: "Server error during session validation"
//     });
//   }
// };


//  * Generate SSO token for E-Lock redirection
//  * Generates a short-lived JWT token containing only ie_code_no
//  */
