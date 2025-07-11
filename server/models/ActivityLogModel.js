import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    // User information
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    user_email: {
      type: String,
      required: true,
      trim: true,
    },
    user_name: {
      type: String,
      required: true,
      trim: true,
    },
    ie_code_no: {
      type: String,
      required: true,
      trim: true,
    },
    
    // Activity details
    activity_type: {
      type: String,
      required: true,
      enum: [
        'login', 
        'logout', 
        'password_change', 
        'profile_update',
        'job_view',
        'job_update',
        'document_upload',
        'document_download',
        'search',
        'filter_applied',
        'export_data',
        'failed_login',
        'session_expired',
        'unauthorized_access',
        'sso_token_generated'
      ],
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    
    // Session and security information
    ip_address: {
      type: String,
      trim: true,
    },
    user_agent: {
      type: String,
      trim: true,
    },
    session_id: {
      type: String,
      trim: true,
    },
    
    // Location information (derived from IP)
    location: {
      city: String,
      state: String,
      country: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    
    // Activity metadata
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
    details: {
      type: mongoose.Schema.Types.Mixed, // Can store any additional data
    },
    
    // Related entities
    related_job_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
    },
    related_job_no: {
      type: String,
      trim: true,
    },
    
    // Status
    is_suspicious: {
      type: Boolean,
      default: false,
    },
    flagged_by_admin: {
      type: Boolean,
      default: false,
    },
    admin_notes: {
      type: String,
      trim: true,
    },
  },
  { 
    timestamps: true,
    collection: 'activity_logs'
  }
);

// Indexes for better query performance
activityLogSchema.index({ user_id: 1, createdAt: -1 });
activityLogSchema.index({ ie_code_no: 1, createdAt: -1 });
activityLogSchema.index({ activity_type: 1, createdAt: -1 });
activityLogSchema.index({ severity: 1, createdAt: -1 });
activityLogSchema.index({ is_suspicious: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 }); // For recent activities
activityLogSchema.index({ ip_address: 1, user_id: 1 }); // For security analysis

// Static methods for common queries
activityLogSchema.statics.getRecentActivities = function(limit = 50) {
  return this.find()
    .populate('user_id', 'name ie_code_no')
    .sort({ createdAt: -1 })
    .limit(limit);
};

activityLogSchema.statics.getActivitiesByUser = function(userId, limit = 20) {
  return this.find({ user_id: userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

activityLogSchema.statics.getActivitiesByType = function(activityType, limit = 50) {
  return this.find({ activity_type: activityType })
    .populate('user_id', 'name ie_code_no')
    .sort({ createdAt: -1 })
    .limit(limit);
};

activityLogSchema.statics.getSuspiciousActivities = function(limit = 50) {
  return this.find({ is_suspicious: true })
    .populate('user_id', 'name ie_code_no')
    .sort({ createdAt: -1 })
    .limit(limit);
};

activityLogSchema.statics.getActivityStats = function(days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: "$activity_type",
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: "$user_id" }
      }
    },
    {
      $project: {
        activity_type: "$_id",
        count: 1,
        uniqueUserCount: { $size: "$uniqueUsers" },
        _id: 0
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// Instance methods
activityLogSchema.methods.flagAsSuspicious = function(adminNotes = '') {
  this.is_suspicious = true;
  this.flagged_by_admin = true;
  this.admin_notes = adminNotes;
  return this.save();
};

const ActivityLogModel = mongoose.models.ActivityLog || mongoose.model("ActivityLog", activityLogSchema);

export default ActivityLogModel;
