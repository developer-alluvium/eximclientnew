import mongoose from "mongoose";

const userSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userName: {
      type: String,
      default: "Unknown User",
    },
    userEmail: {
      type: String,
      default: "",
    },
    userRole: {
      type: String,
      default: "user",
    },
    ieCode: {
      type: String,
      default: "",
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    lastHeartbeat: {
      type: Date,
      default: Date.now,
      index: true,
    },
    endTime: {
      type: Date,
      default: null,
    },
    totalActiveSeconds: {
      type: Number,
      default: 0,
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    isOnline: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying user active sessions quickly
userSessionSchema.index({ userId: 1, lastHeartbeat: -1 });

const UserSession = mongoose.models.UserSession || mongoose.model("UserSession", userSessionSchema);

export default UserSession;
