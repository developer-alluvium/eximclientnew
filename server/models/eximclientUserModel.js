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
    // New field for multiple IE code assignments
    ie_code_assignments: [ieCodeAssignmentSchema],
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer", // Changed from Admin to Customer
      required: false, // Make optional since SuperAdmin will assign
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'inactive'],
      default: 'pending',
    },
    role: {
      type: String,
      enum: ['super_admin', 'admin' , 'user'],
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
    assignedModules: {
      type: [String],
      default: [],
    },
    columnOrder:{
      type:[String],
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
      ref: "Customer", // Changed from Admin to Customer
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

  },
  { 
    timestamps: true,
   
  }
);

// Virtual for locked account
eximclientUserSchema.virtual('isLocked').get(function() {
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
eximclientUserSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
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
  // Lock account after 5 attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Reset login attempts
eximclientUserSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: {
      loginAttempts: 1,
      lockUntil: 1
    }
  });
};

// Generate email verification token
// eximclientUserSchema.methods.generateVerificationToken = function() {
//   const token = Math.random().toString(36).substr(2, 15) + Math.random().toString(36).substr(2, 15);
//   this.emailVerificationToken = token;
//   return token;
// };

// Generate email verification token
eximclientUserSchema.methods.generateVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = token;
  this.emailVerificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token; // Important: return the token
};

// Add this method inside your eximclientUserSchema definition

// Generate password reset token
eximclientUserSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Store the hashed token in the database for security
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Set token to expire in 10 minutes
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; 

  // Return the unhashed token to be sent via email
  return resetToken; 
};

// Index for better performance
eximclientUserSchema.index({ email: 1 });
eximclientUserSchema.index({ ie_code_no: 1 });
eximclientUserSchema.index({ adminId: 1 });
eximclientUserSchema.index({ status: 1 });
eximclientUserSchema.index({ emailVerificationToken: 1 });

const EximclientUser = mongoose.model("EximclientUser", eximclientUserSchema);

export default EximclientUser;
