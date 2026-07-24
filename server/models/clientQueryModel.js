import mongoose from "mongoose";

const queryReplySchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    repliedBy: { type: String, required: true },
    senderType: { type: String, enum: ["client", "admin", "superadmin"], default: "client" },
    email: { type: String },
    username: { type: String },
    attachments: [
      {
        fileName: { type: String },
        fileUrl: { type: String },
        fileType: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    repliedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const clientQuerySchema = new mongoose.Schema(
  {
    module_type: { type: String, enum: ["import", "export"], default: "import" },
    job_no: { type: String, required: true, index: true },
    job_id: { type: String },
    client_id: { type: String },
    client_name: { type: String },
    client_email: { type: String },
    client_username: { type: String },
    subject: { type: String, default: "Client Query" },
    message: { type: String, required: true },
    attachments: [
      {
        fileName: { type: String },
        fileUrl: { type: String },
        fileType: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    status: { type: String, enum: ["open", "resolved"], default: "open", index: true },
    seenByClient: { type: Boolean, default: true },
    seenByAdmin: { type: Boolean, default: false },
    resolvedBy: { type: String },
    resolvedAt: { type: Date },
    resolutionNote: { type: String },
    replies: [queryReplySchema],
  },
  { timestamps: true }
);

clientQuerySchema.index({ job_no: 1, status: 1 });
clientQuerySchema.index({ createdAt: -1 });

export default mongoose.models.ClientQuery || mongoose.model("ClientQuery", clientQuerySchema);
