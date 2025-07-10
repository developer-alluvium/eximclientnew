import CustomerModel from "../models/customerModel.js";
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
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "12h";

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
      { expiresIn: JWT_EXPIRES_IN }
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

export const logout = async (req, res) => {
  try {
    // Try to log logout activity and update last logout time if user info is available
    if (req.user || req.body.user_id) {
      try {
        const userId = req.user?.id || req.body.user_id;
        const customer = await CustomerModel.findById(userId);
        
        if (customer) {
          // Update last logout time
          customer.lastLogout = new Date();
          await customer.save();
          
          const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
          const userAgent = req.headers['user-agent'] || 'Unknown';
          
          await ActivityLogModel.create({
            user_id: customer._id,
            user_email: customer.email || `${customer.ie_code_no}@example.com`,
            user_name: customer.name,
            ie_code_no: customer.ie_code_no,
            activity_type: 'logout',
            description: 'User logged out successfully',
            ip_address: ipAddress,
            user_agent: userAgent,
            severity: 'low',
            details: {
              logout_method: 'manual',
              logout_time: new Date().toISOString()
            }
          });
        }
      } catch (activityError) {
        console.error('Error logging logout activity:', activityError);
        // Continue with logout even if activity logging fails
      }
    }

    // Clear authentication cookies
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during logout",
      error: error.message,
    });
  }
};

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
export const registerCustomer = async (req, res) => {
  try {
    const { ie_code_no, pan_number, name } = req.body;

    console.log(`Register customer attempt with IE code: ${ie_code_no}`);

    // Validate required fields
    if (!ie_code_no || !pan_number) {
      return res.status(400).json({
        success: false,
        message: "Please provide IE code and PAN number",
      });
    }

    // Check if customer already exists
    const existingCustomer = await CustomerModel.findOne({ ie_code_no });
    if (existingCustomer) {
      console.log(`Customer with IE code ${ie_code_no} already exists`);
      return res.status(400).json({
        success: false,
        message: "Customer with this IE code already exists",
      });
    }

    // Find related Job and KYC records
    const job = await JobModel.findOne({ ie_code_no });
    if (!job) {
      console.log(`Job with IE code ${ie_code_no} not found`);
      return res.status(400).json({
        success: false,
        message: "No job found with this IE code",
      });
    }

    // Find matching CustomerKYC entry
    const customerKYC = await CustomerKycModel.findOne({
      $or: [
        { iec_no: ie_code_no },
        { pan_no: pan_number },
        { name_of_individual: name || job.importer },
      ],
    });

    if (!customerKYC) {
      console.log(`CustomerKYC for ${ie_code_no} not found`);
      return res.status(400).json({
        success: false,
        message: "No KYC record found with provided details",
      });
    }

    // Create new customer
    const customer = new CustomerModel({
      name: name || job.importer,
      ie_code_id: job._id,
      ie_code_no,
      pan_id: customerKYC._id,
      pan_number: pan_number || customerKYC.pan_no,
      isActive: true,
    });    // Generate and set password
    const generatedPassword = customer.generatePassword();
    customer.password = generatedPassword; // Set plain text, pre-save hook will hash it
    customer.initialPassword = generatedPassword; // Store plain text for admin viewing

    await customer.save();

    console.log(`New customer registered with IE code: ${ie_code_no}`);

    res.status(201).json({
      success: true,
      message: "Customer registered successfully",
      customer: {
        id: customer._id,
        name: customer.name,
        ie_code_no: customer.ie_code_no,
        isActive: customer.isActive,
        initialPassword: generatedPassword,
      },
    });
  } catch (error) {
    console.error("Customer registration error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during customer registration",
      error: error.message,
    });
  }
};

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

    await CustomerModel.findByIdAndUpdate(userId, { columnOrder });

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

    // First try to find by ID
    let user = await CustomerModel.findById(userId);
    //console.log("User found by ID:", user ? "Yes" : "No");
    
    // If not found by ID, try to find by name or IE code (fallback for localStorage mismatch)
    if (!user) {
     // console.log("Attempting to find user by alternative methods...");
      
      // Try to find any user (since there's only 1 in collection based on debug info)
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

/**
 * Get CustomerKYC data for registration dropdown
 */
/**
 * DEPRECATED: Get customer KYC list - Use getAllCustomersUnified instead
 * Kept for backward compatibility during transition
 */
export const getCustomerKycList = async (req, res) => {
  console.warn("DEPRECATED: getCustomerKycList - Use getAllCustomersUnified with ?status=inactive instead");
  
  // Redirect to unified API with inactive status to get available KYC records
  req.query.status = 'inactive';
  req.query.includeKyc = 'true';
  return await getAllCustomersUnified(req, res);
};

/**
 * DEPRECATED: Get all registered customers - Use getAllCustomersUnified instead
 * Kept for backward compatibility during transition
 */
export const getRegisteredCustomers = async (req, res) => {
  console.warn("DEPRECATED: getRegisteredCustomers - Use getAllCustomersUnified with ?status=registered instead");
  
  // Redirect to unified API
  req.query.status = 'registered';
  return await getAllCustomersUnified(req, res);
};;

// Update customer password (admin function)
export const updateCustomerPassword = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { newPassword } = req.body;

    console.log(`\n=== PASSWORD UPDATE API CALLED ===`);
    console.log(`Customer ID: ${customerId}`);
    console.log(`New Password: ${newPassword}`);
    console.log(`Request body:`, req.body);

    if (!newPassword || newPassword.length < 6) {
      console.log(`❌ Validation failed: Password too short`);
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Find the customer first
    const customer = await CustomerModel.findById(customerId);
    
    if (!customer) {
      console.log(`❌ Customer not found with ID: ${customerId}`);
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    console.log(`✅ Found customer: ${customer.ie_code_no}`);
    console.log(`   Current password hash: ${customer.password.substring(0, 20)}...`);
    console.log(`   Current initialPassword: ${customer.initialPassword}`);
    console.log(`   Current password_changed: ${customer.password_changed}`);

    // Update the customer fields - do NOT hash the password here as the pre-save hook will handle it
    customer.password = newPassword; // Set plain text password, pre-save hook will hash it
    customer.initialPassword = newPassword; // Store plain text for admin viewing
    customer.password_changed = true;

    console.log(`   Setting password_changed to: ${customer.password_changed}`);
    console.log(`   About to save customer...`);

    // Save the customer - this will trigger the pre-save hook to hash the password
    const updatedCustomer = await customer.save();

    console.log(`✅ Password updated successfully for customer: ${updatedCustomer.ie_code_no}`);
    console.log(`   New password hash: ${updatedCustomer.password.substring(0, 20)}...`);
    console.log(`   New initialPassword: ${updatedCustomer.initialPassword}`);
    console.log(`   New password_changed: ${updatedCustomer.password_changed}`);
    console.log(`=== PASSWORD UPDATE API COMPLETE ===\n`);

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
      data: {
        customer: {
          id: updatedCustomer._id,
          ie_code_no: updatedCustomer.ie_code_no,
          name: updatedCustomer.name,
          password_changed: updatedCustomer.password_changed,
        },
        newPassword: newPassword,
      },
    });
  } catch (error) {
    console.error("❌ Error updating customer password:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating password",
      error: error.message,
    });
  }
};

//* SESSION VALIDATION
export const validateSession = async (req, res) => {
  try {
    // At this point, if the middleware passed, the user is valid
    // req.user is set by the authenticate middleware
    if (req.user) {
      return res.status(200).json({
        success: true,
        message: "Session valid",
        user: {
          id: req.user.id,
          name: req.user.name,
          ie_code_no: req.user.ie_code_no,
          isActive: req.user.isActive,
          assignedModules: req.user.assignedModules || []
        }
      });
    } else {
      return res.status(401).json({
        success: false,
        message: "Session invalid"
      });
    }
  } catch (error) {
    console.error("Session validation error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during session validation"
    });
  }
};

/**
 * OPTIMIZED: Unified API to get all customers with filtering capabilities
 * Replaces: getInactiveCustomers, getCustomerKycList, getRegisteredCustomers
 */
export const getAllCustomersUnified = async (req, res) => {
  try {
    const { status = 'all', approval, includeKyc = 'false' } = req.query;
    
    console.log(`Fetching customers with filters - status: ${status}, approval: ${approval}`);

    // Initialize result structure
    const result = {
      registered: [],
      inactive: [],
      pending: [],
      summary: {
        total: 0,
        registered: 0,
        inactive: 0,
        pending: 0
      }
    };

    // Handle different status requests efficiently
    if (status === 'registered' || status === 'all') {
      // For registered customers, fetch directly from customer collection (more efficient)
      console.log('Fetching registered customers from customer collection...');
      
      const registeredCustomers = await CustomerModel.find({})
        .select('_id ie_code_no pan_number name isActive assignedModules createdAt lastLogin password_changed initialPassword email phone allowedColumns')
        .lean();

      // If KYC data is needed, get it for registered customers
      let kycMap = new Map();
      if (includeKyc === 'true') {
        const kycRecords = await CustomerKycModel.find({
          $or: registeredCustomers.map(customer => ({ iec_no: customer.ie_code_no }))
        }).lean();
        
        kycRecords.forEach(kyc => {
          const ieCode = kyc.iec_no || kyc.ie_code_no;
          if (ieCode) kycMap.set(ieCode, kyc);
        });
      }

      registeredCustomers.forEach(customer => {
        const registeredCustomer = {
          id: customer._id,
          ie_code_no: customer.ie_code_no,
          pan_number: customer.pan_number,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          status: 'registered',
          isActive: customer.isActive,
          registeredAt: customer.createdAt,
          lastLogin: customer.lastLogin,
          assignedModules: customer.assignedModules || [],
          password_changed: customer.password_changed,
          initialPassword: customer.initialPassword,
          allowedColumns: customer.allowedColumns || [] // <-- Add this line
        };

        if (includeKyc === 'true' && kycMap.has(customer.ie_code_no)) {
          registeredCustomer.kycData = kycMap.get(customer.ie_code_no);
          registeredCustomer.kycApproval = registeredCustomer.kycData.approval;
        }

        result.registered.push(registeredCustomer);
      });

      result.summary.registered = registeredCustomers.length;
    }

    if (status === 'inactive' || status === 'pending' || status === 'all') {
      // For inactive/pending customers, work with KYC collection
      console.log('Fetching inactive/pending customers from KYC collection...');
      
      let kycQuery = {};
      if (approval) {
        kycQuery.approval = approval;
      }

      const kycRecords = await CustomerKycModel.find(kycQuery)
        .select('_id ie_code_no iec_no pan_no pan_number name_of_individual approval createdAt updatedAt email_id mobile_no')
        .lean();

      // Get all registered IE codes for filtering
      const registeredIeCodes = new Set(
        (await CustomerModel.find({}).select('ie_code_no').lean())
        .map(customer => customer.ie_code_no)
      );

      kycRecords.forEach(kyc => {
        // Standardize field names (handle both ie_code_no and iec_no)
        const ieCode = kyc.ie_code_no || kyc.iec_no;
        const panNumber = kyc.pan_number || kyc.pan_no;
        
        if (!ieCode) return; // Skip records without IE code

        // Only process if customer is not already registered
        if (!registeredIeCodes.has(ieCode)) {
          if (kyc.approval === 'Approved') {
            // Inactive customer (approved KYC but no account)
            const inactiveCustomer = {
              id: kyc._id,
              ie_code_no: ieCode,
              pan_number: panNumber,
              name: kyc.name_of_individual,
              email: kyc.email_id,
              phone: kyc.mobile_no,
              status: 'inactive',
              kycApproval: kyc.approval,
              kycApprovedAt: kyc.updatedAt,
              kycCreatedAt: kyc.createdAt,
              isRegistered: false
            };

            if (includeKyc === 'true') {
              inactiveCustomer.kycData = kyc;
            }

            result.inactive.push(inactiveCustomer);
            result.summary.inactive++;
          } else {
            // Pending KYC approval
            const pendingCustomer = {
              id: kyc._id,
              ie_code_no: ieCode,
              pan_number: panNumber,
              name: kyc.name_of_individual,
              email: kyc.email_id,
              phone: kyc.mobile_no,
              status: 'pending',
              kycApproval: kyc.approval,
              kycCreatedAt: kyc.createdAt,
              isRegistered: false
            };

            if (includeKyc === 'true') {
              pendingCustomer.kycData = kyc;
            }

            result.pending.push(pendingCustomer);
            result.summary.pending++;
          }
        }
      });
    }

    // Calculate total
    result.summary.total = result.summary.registered + result.summary.inactive + result.summary.pending;

    // Apply status filter for response
    let responseData;
    let count;

    switch (status) {
      case 'registered':
        responseData = result.registered;
        count = result.summary.registered;
        break;
      case 'inactive':
        responseData = result.inactive;
        count = result.summary.inactive;
        break;
      case 'pending':
        responseData = result.pending;
        count = result.summary.pending;
        break;
      case 'all':
      default:
        responseData = result;
        count = result.summary.total;
        break;
    }

    console.log(`Customers fetched - Total: ${result.summary.total}, Registered: ${result.summary.registered}, Inactive: ${result.summary.inactive}, Pending: ${result.summary.pending}`);

    res.status(200).json({
      success: true,
      message: `Successfully fetched ${count} customers`,
      data: responseData,
      count: count,
      filters: { status, approval, includeKyc }
    });

  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
      error: error.message
    });
  }
};

/**
 * DEPRECATED: Get inactive customers - Use getAllCustomersUnified instead
 * Kept for backward compatibility during transition
 */
export const getInactiveCustomers = async (req, res) => {
  console.warn("DEPRECATED: getInactiveCustomers - Use getAllCustomersUnified with ?status=inactive instead");
  
  // Redirect to unified API
  req.query.status = 'inactive';
  return await getAllCustomersUnified(req, res);
};

/**
 * Get all available columns for SuperAdmin to manage
 */
export const getAvailableColumns = async (req, res) => {
  try {
    // Define all available columns in the system
    const availableColumns = [
      { id: "supplier_exporter", name: "Exporter, Job Number & Free Time" },
      { id: "be_no", name: "BE Number & Date" },
      { id: "checklist", name: "Checklist" },
      { id: "shipment_details", name: "Shipment & Commercial Details" },
      { id: "container_details", name: "Container" },
      { id: "weight_shortage", name: "Weight Shortage/Excess" },
      { id: "movement_timeline", name: "Movement Timeline" },
      { id: "esanchit_documents", name: "eSanchit Documents" },
      { id: "doPlanning", name: "DO Planning" },
      { id: "delivery_planning", name: "Delivery Planning" }
    ];

    res.status(200).json({
      success: true,
      data: availableColumns
    });
  } catch (error) {
    console.error("Error fetching available columns:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch available columns",
      error: error.message,
    });
  }
};

/**
 * Get column permissions for a specific customer
 */
export const getCustomerColumnPermissions = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await CustomerModel.findById(customerId).select('name ie_code_no allowedColumns');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        customer: {
          id: customer._id,
          name: customer.name,
          ie_code_no: customer.ie_code_no,
          allowedColumns: customer.allowedColumns || []
        }
      },
    });
  } catch (error) {
    console.error("Error fetching customer column permissions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer column permissions",
      error: error.message,
    });
  }
};

/**
 * Update column permissions for a specific customer
 */
export const updateCustomerColumnPermissions = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { allowedColumns } = req.body;

    if (!Array.isArray(allowedColumns)) {
      return res.status(400).json({
        success: false,
        message: "allowedColumns must be an array",
      });
    }

    const customer = await CustomerModel.findByIdAndUpdate(
      customerId,
      { allowedColumns },
      { new: true, runValidators: true }
    ).select('name ie_code_no allowedColumns');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    console.log(`Column permissions updated for customer ${customer.name} (${customer.ie_code_no})`);

    res.status(200).json({
      success: true,
      message: "Customer column permissions updated successfully",
      data: {
        id: customer._id,
        name: customer.name,
        ie_code_no: customer.ie_code_no,
        allowedColumns: customer.allowedColumns
      },
    });
  } catch (error) {
    console.error("Error updating customer column permissions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update customer column permissions",
      error: error.message,
    });
  }
};

/**
 * Bulk update column permissions for multiple customers
 */
export const bulkUpdateColumnPermissions = async (req, res) => {
  try {
    const { customerIds, allowedColumns } = req.body;

    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "customerIds must be a non-empty array",
      });
    }

    if (!Array.isArray(allowedColumns)) {
      return res.status(400).json({
        success: false,
        message: "allowedColumns must be an array",
      });
    }

    const result = await CustomerModel.updateMany(
      { _id: { $in: customerIds } },
      { allowedColumns }
    );

    console.log(`Bulk column permissions updated for ${result.modifiedCount} customers`);

    res.status(200).json({
      success: true,
      message: `Column permissions updated for ${result.modifiedCount} customers`,
      data: {
        modifiedCount: result.modifiedCount,
        allowedColumns
      },
    });
  } catch (error) {
    console.error("Error in bulk column permissions update:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update column permissions",
      error: error.message,
    });
  }
};
