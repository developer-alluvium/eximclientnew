import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String, // Storing the actual name string
      trim: true,
    },
    ie_code_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    columnOrder: [String],
    ie_code_no: { type: String, trim: true },
    pan_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerKYC",
      required: true,
    },
    pan_number: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
    lastLogout: Date,
    password: {
      type: String,
      minlength: 6,
    },
    initialPassword: {
      type: String,
    },
    password_changed: {
      type: Boolean,
      default: false,
    },
    assignedModules: {
      type: [String],
      default: [], // Empty array means no modules assigned
    },
    allowedColumns: {
      type: [String],
      default: [], // Empty array means all columns allowed by default
    },
    role: {
      type: String,
      enum: ['superadmin', 'admin', 'customer'],
      default: 'customer'
    },
    roleGrantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      default: null,
    },
    roleGrantedAt: {
      type: Date,
      default: null,
    }, // ← Fixed: Added missing closing brace and comma
    jobsTabVisible: {
      type: Boolean,
      default: true,
    },
    gandhidhamTabVisible: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Hash password before save
customerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  
  try {
    const hash = await bcrypt.hash(this.password, 10);
    this.password = hash;
    next();
  } catch (error) {
    next(error);
  }
});

// Password check
customerSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error(error);
  }
};

// Generate password
customerSchema.methods.generatePassword = function () {
  const iecPart = this.ie_code_no?.slice(-4);
  const panPart = this.pan_number?.slice(0, 4);
  //const randomChar = Math.random().toString(36).substring(2, 4);
  //return `${iecPart}@${panPart}#${randomChar}`;
  return `${iecPart}@${panPart}`;
};

// Virtual to get related jobs
customerSchema.virtual("jobs", {
  ref: "Job",
  localField: "ie_code_no",
  foreignField: "ie_code_no",
  justOne: false,
});

const CustomerModel =
  mongoose.models.Customer || mongoose.model("Customer", customerSchema);
export default CustomerModel;