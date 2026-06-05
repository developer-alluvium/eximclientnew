import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from 'crypto';

const ieCodeAssignmentSchema = new mongoose.Schema({
  ie_code_no: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  importer_name: {
    type: String,
    required: true,
    trim: true
  },
  assigned_at: {
    type: Date,
    required: true,
    default: Date.now
  },
  assigned_by: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'assigned_by_model'
  },
  assigned_by_model: {
    type: String,
    required: true,
    enum: ['SuperAdmin', 'Admin', 'Customer']
  }
}, { _id: false });

const eximclientUserSchema = new mongoose.Schema(
  {
    sample_downloaded: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    // Deprecated: To be migrated to ie_code_assignments
    ie_code_no: {
      type: String,
      trim: true,
      uppercase: true,
    },
    // Deprecated: To be migrated to ie_code_assignments 
    assignedImporterName: {
      type: String,
      trim: true,
      default: null,
    },
    // Importer IE code assignments (Import DSR module)
    ie_code_assignments: [ieCodeAssignmentSchema],
    // Exporter IE code assignments (Export DSR module)
    exporter_ie_code_assignments: [ieCodeAssignmentSchema],
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'inactive'],
      default: 'pending',
    },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'user'],
      default: 'user'
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    verifiedEmail: {
      type: Boolean,
      default: true,
    },

    // AEO Certificate Reminder Settings - MOVED TO MAIN SCHEMA
    aeo_reminder_days: {
      type: Number,
      default: 90,
      min: 1,
      max: 365
    },
    aeo_reminder_enabled: {
      type: Boolean,
      default: true
    },

    assignedModules: {
      type: [String],
      default: [],
    },
    columnOrder: {
      type: [String],
      default: [],
    },
    transportColumnOrder: {
      type: [String],
      default: [],
    },
    allowedColumns: {
      type: [String],
      default: [],
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    lastLogout: {
      type: Date,
      default: null,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    registrationIp: {
      type: String,
      trim: true,
    },
    verificationDate: {
      type: Date,
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    assignedIeCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    assignedImporterName: {
      type: String,
      trim: true,
      default: null,
    },
    jobsTabVisible: {
      type: Boolean,
      default: true,
    },
    gandhidhamTabVisible: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      default: null,
    },
    emailVerificationTokenExpires: {
      type: Date,
      default: null
    },
    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
    },
    pendingEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    documents: [{
      title: {
        type: String,
        required: true,
        trim: true
      },
      url: {
        type: String,
        required: true,
        trim: true
      },
      uploadDate: {
        type: Date,
        default: Date.now
      },
      expirationDate: {
        type: Date,
        default: null
      },
      reminderDays: {
        type: Number,
        default: null
      },
      reminderSent: {
        type: Boolean,
        default: false
      }
    }],
    selected_branches: {
      type: [String],
      default: [],
    },
    selected_icd_codes: {
      type: [String],
      default: [],
    },
    selected_ports: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for locked account
eximclientUserSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Hash password before save
eximclientUserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
eximclientUserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Increment login attempts
eximclientUserSchema.methods.incLoginAttempts = function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: {
        loginAttempts: 1,
      },
      $unset: {
        lockUntil: 1
      }
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }

  return this.updateOne(updates);
};

// Reset login attempts
eximclientUserSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: {
      loginAttempts: 1,
      lockUntil: 1
    }
  });
};

// Generate email verification token
eximclientUserSchema.methods.generateVerificationToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = token;
  this.emailVerificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
  return token;
};

// Generate password reset token
eximclientUserSchema.methods.generatePasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

// Add IE code assignment
eximclientUserSchema.methods.addIeCodeAssignment = function (ieCodeNo, importerName, actor) {
  if (!this.ie_code_assignments) {
    this.ie_code_assignments = [];
  }
  const normalized = ieCodeNo.trim().toUpperCase();
  const existing = this.ie_code_assignments.find(a => a.ie_code_no === normalized);
  if (!existing) {
    this.ie_code_assignments.push({
      ie_code_no: normalized,
      importer_name: importerName,
      assigned_at: new Date(),
      assigned_by: actor ? (actor.id || actor._id) : null,
      assigned_by_model: actor ? (actor.role === 'superadmin' || actor.role === 'super_admin' ? 'SuperAdmin' : 'Admin') : 'SuperAdmin'
    });
  }
};

// Remove IE code assignment
eximclientUserSchema.methods.removeIeCodeAssignment = function (ieCodeNo) {
  if (!this.ie_code_assignments) return;
  const normalized = ieCodeNo.trim().toUpperCase();
  this.ie_code_assignments = this.ie_code_assignments.filter(a => a.ie_code_no !== normalized);
};

// Get assigned IE codes
eximclientUserSchema.methods.getAssignedIeCodes = function () {
  return this.ie_code_assignments || [];
};

// Index for better performance
eximclientUserSchema.index({ ie_code_no: 1 });
eximclientUserSchema.index({ adminId: 1 });
eximclientUserSchema.index({ status: 1 });
eximclientUserSchema.index({ emailVerificationToken: 1 });

const EximclientUser = mongoose.model("EximclientUser", eximclientUserSchema);
export default EximclientUser;