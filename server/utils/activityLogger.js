import ActivityLogModel from "../models/ActivityLogModel.js";
import CustomerModel from "../models/customerModel.js";
import EximclientUser from "../models/eximclientUserModel.js";

/**
 * Log user activity utility function
 * @param {Object} options - Activity logging options
 * @param {String} options.user_id - User ID
 * @param {String} options.activity_type - Type of activity
 * @param {String} options.description - Activity description
 * @param {Object} options.req - Express request object
 * @param {String} options.severity - Activity severity (low, medium, high, critical)
 * @param {Object} options.details - Additional activity details
 * @param {String} options.related_job_id - Related job ID if applicable
 * @param {String} options.related_job_no - Related job number if applicable
 * @param {Boolean} options.is_suspicious - Mark as suspicious activity
 */
export const logUserActivity = async (options) => {
  try {
    const {
      user_id,
      activity_type,
      description,
      req,
      severity = 'low',
      details = {},
      related_job_id,
      related_job_no,
      is_suspicious = false
    } = options;

    // Validate required fields
    if (!user_id || !activity_type || !description) {
      console.error('Missing required fields for activity logging:', { user_id, activity_type, description });
      return null;
    }

    // Get user information
    const user = await EximclientUser.findById(user_id);
    if (!user) {
      console.error('User not found for activity logging:', user_id);
      return null;
    }

    // Extract request information
    const ipAddress = req?.ip || req?.connection?.remoteAddress || req?.socket?.remoteAddress || 'Unknown';
    const userAgent = req?.headers['user-agent'] || 'Unknown';
    const sessionId = req?.session?.id || req?.headers['x-session-id'] || 'Unknown';

    // Get location from IP (simple implementation)
    const location = await getLocationFromIP(ipAddress);

    // Create activity log
    const activityLog = new ActivityLogModel({
      user_id,
      user_email: user.email || `${user.ie_code_no}@example.com`,
      user_name: user.name,
      ie_code_no: user.ie_code_no,
      activity_type,
      description,
      ip_address: ipAddress,
      user_agent: userAgent,
      session_id: sessionId,
      location,
      severity,
      details,
      related_job_id,
      related_job_no,
      is_suspicious
    });

    await activityLog.save();
    return activityLog;

  } catch (error) {
    console.error('Error logging user activity:', error);
    return null;
  }
};

/**
 * Simple location lookup from IP
 */
const getLocationFromIP = async (ipAddress) => {
  try {
    // Skip localhost/private IPs
    if (!ipAddress || 
        ipAddress === '127.0.0.1' || 
        ipAddress === '::1' || 
        ipAddress.startsWith('192.168.') || 
        ipAddress.startsWith('10.') ||
        ipAddress.startsWith('172.')) {
      return {
        city: "Local",
        state: "Local",
        country: "Local Network",
        coordinates: { lat: 0, lng: 0 }
      };
    }

    // For now, return unknown for external IPs
    // In production, you might want to use a geolocation service
    return {
      city: "Unknown",
      state: "Unknown",
      country: "Unknown",
      coordinates: { lat: 0, lng: 0 }
    };

  } catch (error) {
    console.error('Error getting location from IP:', error);
    return {
      city: "Unknown",
      state: "Unknown",
      country: "Unknown",
      coordinates: { lat: 0, lng: 0 }
    };
  }
};

/**
 * Middleware to automatically log certain activities
 */
export const activityLogger = (activityType, description) => {
  return async (req, res, next) => {
    // Continue with the request first
    next();

    // Log activity after the request (non-blocking)
    if (req.user) {
      setImmediate(async () => {
        await logUserActivity({
          user_id: req.user.id,
          activity_type: activityType,
          description: typeof description === 'function' ? description(req) : description,
          req,
          severity: 'low',
          details: {
            method: req.method,
            url: req.originalUrl,
            timestamp: new Date().toISOString()
          }
        });
      });
    }
  };
};

/**
 * Log job-related activities
 */
export const logJobActivity = async (options) => {
  const {
    user_id,
    job_id,
    job_no,
    action,
    req,
    details = {}
  } = options;

  await logUserActivity({
    user_id,
    activity_type: 'job_update',
    description: `${action} for job ${job_no}`,
    req,
    severity: 'low',
    details: {
      action,
      job_id,
      job_no,
      ...details
    },
    related_job_id: job_id,
    related_job_no: job_no
  });
};

/**
 * Log document activities
 */
export const logDocumentActivity = async (options) => {
  const {
    user_id,
    document_type,
    action, // 'upload', 'download', 'view', 'delete'
    filename,
    req,
    details = {}
  } = options;

  await logUserActivity({
    user_id,
    activity_type: `document_${action}`,
    description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${document_type}: ${filename}`,
    req,
    severity: 'low',
    details: {
      document_type,
      action,
      filename,
      ...details
    }
  });
};

/**
 * Log search activities
 */
export const logSearchActivity = async (options) => {
  const {
    user_id,
    search_query,
    search_type,
    results_count,
    req,
    details = {}
  } = options;

  await logUserActivity({
    user_id,
    activity_type: 'search',
    description: `Searched for "${search_query}" in ${search_type}`,
    req,
    severity: 'low',
    details: {
      search_query,
      search_type,
      results_count,
      ...details
    }
  });
};

/**
 * Simple logActivity function for the new user system
 * @param {String} userId - User ID
 * @param {String} activityType - Type of activity
 * @param {String} description - Activity description
 * @param {Object} details - Additional details
 * @param {String} ipAddress - IP address
 */
export const logActivity = async (userId, activityType, description, details = {}, ipAddress = null) => {
  try {
    // Get user information to fill required fields
    const user = await EximclientUser.findById(userId);
    if (!user) {
      console.error('User not found for activity logging:', userId);
      return null;
    }

    const activityLog = new ActivityLogModel({
      user_id: userId,
      user_name: user.name,
      user_email: user.email || 'unknown@email.com',
      ie_code_no: user.ie_code_no,
      activity_type: activityType,
      description,
      ip_address: ipAddress,
      user_agent: details.userAgent || null,
      severity: 'medium',
      details,
      timestamp: new Date()
    });

    await activityLog.save();
    return activityLog;
  } catch (error) {
    console.error('Error logging activity:', error);
    return null;
  }
};
