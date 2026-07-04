import mongoose from "mongoose";

const containerEwayBillSchema = new mongoose.Schema(
  {
    containerNumber: { type: String, trim: true, required: true },
    ewayBillNo: { type: String, trim: true },
    ewayBillDate: { type: Date },
    ewayBillUrl: { type: String, trim: true },
    ewayBillStatus: { type: String, trim: true, default: "Pending" }, // "Pending", "Generated", "Cancelled"
    ewayBillData: { type: mongoose.Schema.Types.Mixed }, // Stores the Masters India response data
  }
);

const otherEwayBillSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EximclientUser",
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EximclientUser",
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
    },
    jobNo: { type: String, trim: true },
    boeNumber: { type: String, trim: true },
    boeDate: { type: Date },
    pdfUrl: { type: String, trim: true },
    pdfKey: { type: String, trim: true },
    parsedData: { type: mongoose.Schema.Types.Mixed }, // Store the parsed BOE response
    containers: [containerEwayBillSchema], // Nested list of containers and their E-Way Bills
    ewayBillStatus: { type: String, trim: true, default: "Pending" }, // "Pending", "Partially Generated", "Generated", "Cancelled"
  },
  { timestamps: true }
);

const OtherEwayBill = mongoose.model("OtherEwayBill", otherEwayBillSchema);
export default OtherEwayBill;
