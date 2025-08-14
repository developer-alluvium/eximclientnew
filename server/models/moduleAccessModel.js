import mongoose from "mongoose";

const moduleAccessSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EximclientUser",
      required: true,
    },
    ie_code_no: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    moduleName: {
      type: String,
      required: true,
      trim: true,
    },
    moduleKey: {
      type: String,
      required: true,
      trim: true,
    },
    isEnabled: {
      type: Boolean,
      default: false,
    },
    enabledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    enabledAt: {
      type: Date,
      default: null,
    },
    lastAccessed: {
      type: Date,
      default: null,
    },
    accessCount: {
      type: Number,
      default: 0,
    },
    permissions: {
      canView: {
        type: Boolean,
        default: false,
      },
      canEdit: {
        type: Boolean,
        default: false,
      },
      canDelete: {
        type: Boolean,
        default: false,
      },
      canExport: {
        type: Boolean,
        default: false,
      },
    },
    restrictions: {
      maxDailyAccess: {
        type: Number,
        default: null, // null means unlimited
      },
      allowedTimeSlots: [{
        start: String, // "09:00"
        end: String,   // "17:00"
      }],
      allowedDays: [{
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      }],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { 
    timestamps: true,
    collection: 'module_access'
  }
);

// Compound indexes for better performance
moduleAccessSchema.index({ userId: 1, moduleKey: 1 }, { unique: true });
moduleAccessSchema.index({ ie_code_no: 1 });
moduleAccessSchema.index({ enabledBy: 1 });
moduleAccessSchema.index({ isEnabled: 1 });
moduleAccessSchema.index({ lastAccessed: 1 });

// Update access count and last accessed time
moduleAccessSchema.methods.recordAccess = function() {
  this.lastAccessed = new Date();
  this.accessCount += 1;
  return this.save();
};

// Check if user can access module at current time
moduleAccessSchema.methods.canAccessNow = function() {
  if (!this.isEnabled) return false;
  
  const now = new Date();
  const currentDay = now.toLocaleLowerCase().slice(0, 3) + 'day'; // monday, tuesday, etc.
  const currentTime = now.toTimeString().slice(0, 5); // "14:30"
  
  // Check day restrictions
  if (this.restrictions.allowedDays.length > 0) {
    if (!this.restrictions.allowedDays.includes(currentDay)) {
      return false;
    }
  }
  
  // Check time restrictions
  if (this.restrictions.allowedTimeSlots.length > 0) {
    const isInTimeSlot = this.restrictions.allowedTimeSlots.some(slot => {
      return currentTime >= slot.start && currentTime <= slot.end;
    });
    if (!isInTimeSlot) return false;
  }
  
  return true;
};

const ModuleAccess = mongoose.model("ModuleAccess", moduleAccessSchema);

export default ModuleAccess;
