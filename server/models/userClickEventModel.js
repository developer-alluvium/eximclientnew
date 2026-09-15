import mongoose from "mongoose";

const userClickEventSchema = new mongoose.Schema(
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
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: ["click", "page_view", "tab_change", "action"],
      default: "click",
      index: true,
    },
    path: {
      type: String,
      required: true,
    },
    elementId: {
      type: String,
      default: "",
    },
    elementText: {
      type: String,
      default: "",
    },
    componentName: {
      type: String,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

userClickEventSchema.index({ userId: 1, timestamp: -1 });

const UserClickEvent = mongoose.models.UserClickEvent || mongoose.model("UserClickEvent", userClickEventSchema);

export default UserClickEvent;
