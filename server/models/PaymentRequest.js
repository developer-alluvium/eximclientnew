import mongoose from "mongoose";

/**
 * PaymentRequest Schema
 * Tracks manual payment submissions (NEFT/RTGS/IMPS/UPI) with payment slips.
 * 
 * Flow:
 * 1. Client submits UTR + Uploaded Slip + INR Amount.
 * 2. Status is 'PENDING'.
 * 3. Admin reviews slip and approves -> wallet credited via walletService.approvePayment().
 */
const paymentRequestSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EximclientUser",
      required: [true, "Client ID is required"],
      index: true,
    },
    amountInr: {
      type: Number,
      required: [true, "Payment amount in INR is required"],
      min: [1, "Amount must be at least ₹1"],
    },
    creditsRequested: {
      type: Number,
      required: [true, "Credits requested is required"],
      min: [1, "Requested credits must be at least 1"],
    },
    utrNumber: {
      type: String,
      required: [true, "UTR/Transaction reference number is required"],
      trim: true,
      uppercase: true,
      index: true,
    },
    slipFileUrl: {
      type: String,
      required: [true, "Payment slip file URL is required"],
      trim: true,
    },
    slipFileKey: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: {
        values: ["PENDING", "APPROVED", "REJECTED"],
        message: "{VALUE} is not a valid payment status",
      },
      default: "PENDING",
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EximclientUser",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

paymentRequestSchema.index({ clientId: 1, createdAt: -1 });

const PaymentRequest = mongoose.model("PaymentRequest", paymentRequestSchema);

export default PaymentRequest;
