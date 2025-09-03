import ActivityLogModel from "../models/ActivityLogModel.js";
import axios from "axios";
import EximclientUser from "../models/eximclientUserModel.js";

/**
 * Helper function to get location from IP address
 */
const getLocationFromIP = async (ipAddress) => {
  try {
    // Skip localhost/private IPs
    if (!ipAddress || ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.')) {
      return {
        city: "Local",
        state: "Local",
        country: "Local Network",
        coordinates: { lat: 0, lng: 0 }
      };
    }

    // Use a free IP geolocation service
    const response = await axios.get(`http://ip-api.com/json/${ipAddress}?fields=status,message,country,regionName,city,lat,lon`, {
      timeout: 5000
    });

    if (response.data.status === 'success') {
      return {
        city: response.data.city || "Unknown",
        state: response.data.regionName || "Unknown",
        country: response.data.country || "Unknown",
        coordinates: {
          lat: response.data.lat || 0,
          lng: response.data.lon || 0
        }
      };
    }
  } catch (error) {
    console.error('Error getting location from IP:', error.message);
  }

  return {
    city: "Unknown",
    state: "Unknown", 
    country: "Unknown",
    coordinates: { lat: 0, lng: 0 }
  };
};

/**
 * Log user activity
 */
export const logActivity = async (req, res) => {
  try {
    const {
      user_id,
      activity_type,
      description,
      severity = 'low',
      details = {},
      related_job_id,
      related_job_no
    } = req.body;

    // Validate required fields


    // Get user information
    const user = await EximclientUser.findById(user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Get client information
    const ipAddress = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const sessionId = req.session?.id || req.headers['x-session-id'] || 'Unknown';

    // Get location from IP (async, but we don't wait for it)
    const location = await getLocationFromIP(ipAddress);

    // Create activity log
    const activityLog = new ActivityLogModel({
      user_id,
      user_email: user.email ,
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
      related_job_no
    });

    await activityLog.save();

    res.status(201).json({
      success: true,
      message: "Activity logged successfully",
      activity: {
        id: activityLog._id,
        activity_type: activityLog.activity_type,
        description: activityLog.description,
        timestamp: activityLog.createdAt
      }
    });

  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({
      success: false,
      message: "Error logging activity",
      error: error.message
    });
  }
};

/**
 * Get recent activities for all users (SuperAdmin view)
 */
export const getRecentActivities = async (req, res) => {
  try {
    const { limit = 50, page = 1, activity_type, severity, user_id } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    if (activity_type) query.activity_type = activity_type;
    if (severity) query.severity = severity;
    if (user_id) query.user_id = user_id;

    // Get activities with pagination
    const activities = await ActivityLogModel.find(query)
      .populate('user_id', 'name ie_code_no email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalCount = await ActivityLogModel.countDocuments(query);

    res.json({
      success: true,
      data: activities,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page * limit < totalCount,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error getting recent activities:', error);
    res.status(500).json({
      success: false,
      message: "Error fetching activities",
      error: error.message
    });
  }
};

/**
 * Get activities for a specific user
 */
export const getUserActivities = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const activities = await ActivityLogModel.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await ActivityLogModel.countDocuments({ user_id: userId });

    res.json({
      success: true,
      data: activities,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page * limit < totalCount,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error getting user activities:', error);
    res.status(500).json({
      success: false,
      message: "Error fetching user activities",
      error: error.message
    });
  }
};

/**
 * Get activity statistics
 */
export const getActivityStats = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get overall stats
    const totalActivities = await ActivityLogModel.countDocuments({
      createdAt: { $gte: startDate }
    });

    const activeUsers = await ActivityLogModel.distinct('user_id', {
      createdAt: { $gte: startDate }
    });

    const failedLogins = await ActivityLogModel.countDocuments({
      activity_type: 'failed_login',
      createdAt: { $gte: startDate }
    });

    const suspiciousActivities = await ActivityLogModel.countDocuments({
      is_suspicious: true,
      createdAt: { $gte: startDate }
    });

    // Get activity breakdown
    const activityBreakdown = await ActivityLogModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: "$activity_type",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get top users by activity
    const topUsers = await ActivityLogModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: "$user_id",
          count: { $sum: 1 },
          user_name: { $first: "$user_name" },
          ie_code_no: { $first: "$ie_code_no" }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Get recent login sessions
    const recentSessions = await ActivityLogModel.find({
      activity_type: 'login',
      createdAt: { $gte: startDate }
    })
      .populate('user_id', 'name ie_code_no')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        overview: {
          total_activities: totalActivities,
          active_users: activeUsers.length,
          failed_logins: failedLogins,
          suspicious_activities: suspiciousActivities
        },
        activity_breakdown: activityBreakdown,
        top_users: topUsers,
        recent_sessions: recentSessions
      }
    });

  } catch (error) {
    console.error('Error getting activity stats:', error);
    res.status(500).json({
      success: false,
      message: "Error fetching activity statistics",
      error: error.message
    });
  }
};

/**
 * Get suspicious activities
 */
export const getSuspiciousActivities = async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const activities = await ActivityLogModel.find({ is_suspicious: true })
      .populate('user_id', 'name ie_code_no email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await ActivityLogModel.countDocuments({ is_suspicious: true });

    res.json({
      success: true,
      data: activities,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page * limit < totalCount,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error getting suspicious activities:', error);
    res.status(500).json({
      success: false,
      message: "Error fetching suspicious activities",
      error: error.message
    });
  }
};

/**
 * Flag activity as suspicious
 */
export const flagActivityAsSuspicious = async (req, res) => {
  try {
    const { activityId } = req.params;
    const { admin_notes = '' } = req.body;

    const activity = await ActivityLogModel.findById(activityId);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found"
      });
    }

    await activity.flagAsSuspicious(admin_notes);

    res.json({
      success: true,
      message: "Activity flagged as suspicious",
      activity: {
        id: activity._id,
        is_suspicious: activity.is_suspicious,
        admin_notes: activity.admin_notes
      }
    });

  } catch (error) {
    console.error('Error flagging activity:', error);
    res.status(500).json({
      success: false,
      message: "Error flagging activity",
      error: error.message
    });
  }
};

/**
 * Get currently active sessions
 */
export const getActiveSessions = async (req, res) => {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    // Get recent login activities
    const recentLogins = await ActivityLogModel.find({
      activity_type: 'login',
      createdAt: { $gte: thirtyMinutesAgo }
    })
      .populate('user_id', 'name ie_code_no email lastLogin')
      .sort({ createdAt: -1 });

    // Get recent logout activities
    const recentLogouts = await ActivityLogModel.find({
      activity_type: 'logout',
      createdAt: { $gte: thirtyMinutesAgo }
    });

    // Create a map of logged out users
    const loggedOutUsers = new Set(recentLogouts.map(logout => logout.user_id.toString()));

    // Filter active sessions (users who logged in but haven't logged out)
    const activeSessions = recentLogins.filter(login => 
      !loggedOutUsers.has(login.user_id._id.toString())
    );

    // Get session details with last activity
    const sessionDetails = await Promise.all(
      activeSessions.map(async (session) => {
        const lastActivity = await ActivityLogModel.findOne({
          user_id: session.user_id._id
        }).sort({ createdAt: -1 });

        return {
          user: {
            id: session.user_id._id,
            name: session.user_id.name,
            ie_code_no: session.user_id.ie_code_no,
            email: session.user_id.email
          },
          login_time: session.createdAt,
          last_activity: lastActivity?.createdAt || session.createdAt,
          location: session.location,
          device: session.user_agent,
          ip_address: session.ip_address,
          status: getSessionStatus(lastActivity?.createdAt || session.createdAt)
        };
      })
    );

    res.json({
      success: true,
      data: sessionDetails,
      count: sessionDetails.length
    });

  } catch (error) {
    console.error('Error getting active sessions:', error);
    res.status(500).json({
      success: false,
      message: "Error fetching active sessions",
      error: error.message
    });
  }
};

/**
 * Helper function to determine session status
 */
const getSessionStatus = (lastActivity) => {
  const now = new Date();
  const timeDiff = now - new Date(lastActivity);
  const minutesDiff = timeDiff / (1000 * 60);

  if (minutesDiff < 5) return 'active';
  if (minutesDiff < 15) return 'idle';
  return 'inactive';
};

/**
 * Bulk log activities (for batch operations)
 */
export const bulkLogActivities = async (req, res) => {
  try {
    const { activities } = req.body;

    if (!Array.isArray(activities) || activities.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Activities array is required"
      });
    }

    // Get client information
    const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const sessionId = req.session?.id || req.headers['x-session-id'] || 'Unknown';

    // Process each activity
    const processedActivities = await Promise.all(
      activities.map(async (activity) => {
        const user = await EximclientUser.findById(activity.user_id);
        if (!user) return null;

        const location = await getLocationFromIP(ipAddress);

        return {
          user_id: activity.user_id,
          user_email: user.email || `${user.ie_code_no}@example.com`,
          user_name: user.name,
          ie_code_no: user.ie_code_no,
          activity_type: activity.activity_type,
          description: activity.description,
          ip_address: ipAddress,
          user_agent: userAgent,
          session_id: sessionId,
          location,
          severity: activity.severity || 'low',
          details: activity.details || {},
          related_job_id: activity.related_job_id,
          related_job_no: activity.related_job_no
        };
      })
    );

    // Filter out null values (users not found)
    const validActivities = processedActivities.filter(activity => activity !== null);

    // Bulk insert
    const result = await ActivityLogModel.insertMany(validActivities);

    res.status(201).json({
      success: true,
      message: `${result.length} activities logged successfully`,
      logged_count: result.length,
      failed_count: activities.length - result.length
    });

  } catch (error) {
    console.error('Error bulk logging activities:', error);
    res.status(500).json({
      success: false,
      message: "Error bulk logging activities",
      error: error.message
    });
  }
};
