import Customer from '../models/customerModel.js';
import CustomerKyc from '../models/customerKycModel.js';
import Job from '../models/jobModel.js';
import AdminModel from '../models/adminModel.js';
import EximclientUser from '../models/eximclientUserModel.js';
import { protectSuperAdmin } from './superAdminController.js';

// Get dashboard analytics
export const getDashboardAnalytics = async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Run all counts in parallel
    const [
      totalCustomers,
      activeCustomers,
      inactiveCustomers,
      kycApproved,
      kycPending,
      kycDraft,
      totalUsers,
      activeUsers,
      pendingUsers,
      totalAdmins,
      activeAdmins,
      totalJobs,
    ] = await Promise.all([
      CustomerKyc.countDocuments(),
      Customer.countDocuments({ isActive: true }),
      Customer.countDocuments({ isActive: false }),
      CustomerKyc.countDocuments({ approval: 'Approved' }),
      CustomerKyc.countDocuments({ approval: 'Pending' }),
      CustomerKyc.countDocuments({ draft: 'save' }),
      EximclientUser.countDocuments(),
      EximclientUser.countDocuments({ status: 'active' }),
      EximclientUser.countDocuments({ status: 'pending' }),
      AdminModel.countDocuments(),
      AdminModel.countDocuments({ isActive: true }),
      Job.countDocuments(),
    ]);

    const analytics = {
      // Core counts
      totalCustomers,
      activeCustomers,
      inactiveCustomers,
      // KYC
      kycApproved,
      kycPending,
      kycDraft,
      // Users
      totalUsers,
      activeUsers,
      pendingUsers,
      // Admins
      totalAdmins,
      activeAdmins,
      // Jobs
      totalJobs,
      timestamp: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard analytics',
    });
  }
};

// Get client engagement — sorted by inactivity (most dormant first)
export const getClientEngagement = async (req, res) => {
  try {
    const now = new Date();

    const customers = await Customer.find({})
      .select('name ie_code_no lastLogin isActive')
      .lean();

    const engagementData = customers.map((customer) => {
      let daysSinceLogin = null;
      let status = 'never';

      if (customer.lastLogin) {
        const diffMs = now - new Date(customer.lastLogin);
        daysSinceLogin = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (daysSinceLogin <= 7) {
          status = 'active';
        } else if (daysSinceLogin <= 30) {
          status = 'moderate';
        } else {
          status = 'inactive';
        }
      }

      return {
        name: customer.name || 'Unknown',
        ie_code_no: customer.ie_code_no || '—',
        lastLogin: customer.lastLogin || null,
        daysSinceLogin,
        status,
        isActive: customer.isActive,
      };
    });

    // Sort: never → inactive → moderate → active
    const statusOrder = { never: 0, inactive: 1, moderate: 2, active: 3 };
    engagementData.sort((a, b) => {
      const orderDiff = statusOrder[a.status] - statusOrder[b.status];
      if (orderDiff !== 0) return orderDiff;
      // Within same status, sort by days inactive descending
      if (a.daysSinceLogin === null && b.daysSinceLogin === null) return 0;
      if (a.daysSinceLogin === null) return -1;
      if (b.daysSinceLogin === null) return 1;
      return b.daysSinceLogin - a.daysSinceLogin;
    });

    res.json({
      success: true,
      data: engagementData,
    });
  } catch (error) {
    console.error('Client engagement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch client engagement data',
    });
  }
};

// Get top clients by job volume (current year 25-26)
export const getJobsBreakdown = async (req, res) => {
  try {
    const pipeline = [
      {
        $match: {
          year: '25-26',
          ie_code_no: { $exists: true, $ne: '', $ne: null },
        },
      },
      {
        $group: {
          _id: '$ie_code_no',
          importer: { $first: '$importer' },
          jobCount: { $sum: 1 },
        },
      },
      { $sort: { jobCount: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          ie_code_no: '$_id',
          importer: 1,
          jobCount: 1,
        },
      },
    ];

    const topClients = await Job.aggregate(pipeline);

    res.json({
      success: true,
      data: topClients,
    });
  } catch (error) {
    console.error('Jobs breakdown error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs breakdown',
    });
  }
};

// Get user activity
export const getUserActivity = async (req, res) => {
  try {
    const { type = 'active', limit = 5 } = req.query;

    let query = {};
    let sort = { createdAt: -1 };

    switch (type) {
      case 'active':
        query = { isActive: false };
        break;
      case 'inactive':
        query = { isActive: true };
        break;
      case 'recent':
        query = {};
        sort = { createdAt: -1 };
        break;
      default:
        query = { isActive: true };
    }

    const users = await Customer.find(query)
      .select('name ie_code_no pan_number isActive createdAt updatedAt')
      .sort(sort)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('User activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user activity',
    });
  }
};

// Get system metrics
export const getSystemMetrics = async (req, res) => {
  try {
    const metrics = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('System metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system metrics',
    });
  }
};

// Get historical analytics data for charts
export const getHistoricalAnalytics = async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;

    const now = new Date();
    let startDate, intervals;

    switch (timeRange) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        intervals = 24;
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        intervals = 7;
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        intervals = 30;
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        intervals = 12;
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        intervals = 7;
    }

    const userGrowthData = [];
    const activityData = [];
    const systemHealthData = [];

    for (let i = intervals - 1; i >= 0; i--) {
      const date = new Date(
        now.getTime() -
          i * (timeRange === '1d' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000)
      );
      const label =
        timeRange === '1d'
          ? date.getHours() + ':00'
          : timeRange === '90d'
          ? 'Week ' + Math.ceil((intervals - i) / 7)
          : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      userGrowthData.push({
        period: label,
        users: Math.floor(Math.random() * 50) + 100 + i * 5,
        sessions: Math.floor(Math.random() * 30) + 50 + i * 3,
        date: date.toISOString(),
      });

      activityData.push({
        period: label,
        logins: Math.floor(Math.random() * 40) + 20,
        registrations: Math.floor(Math.random() * 10) + 2,
        date: date.toISOString(),
      });

      systemHealthData.push({
        period: label,
        cpuUsage: Math.floor(Math.random() * 20) + 25,
        memoryUsage: Math.floor(Math.random() * 15) + 40,
        responseTime: Math.floor(Math.random() * 50) + 100,
        date: date.toISOString(),
      });
    }

    res.json({
      success: true,
      data: {
        userGrowth: userGrowthData,
        activity: activityData,
        systemHealth: systemHealthData,
        timeRange: timeRange,
      },
    });
  } catch (error) {
    console.error('Historical analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch historical analytics',
    });
  }
};