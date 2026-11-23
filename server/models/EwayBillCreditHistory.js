import mongoose from "mongoose";

/**
 * EwayBillCreditHistory Schema
 * Collection: ewaybillcredithistory
 * 
 * Complete audit trail of all credit movements, E-Way Bill generations
 * (individual container, batch, or full BOE), admin adjustments, top-ups,
 * and 3-month free trial savings.
 */
const ewayBillCreditHistorySchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.Mixed, // Supports ObjectId and String
      required: [true, "Client ID is required"],
      index: true,
    },
    transactionType: {
      type: String,
      required: [true, "Transaction type is required"],
      enum: {
        values: [
          "PAYMENT_CREDIT",       // Credits deposited from approved payment / top-up
          "EWAYBILL_DEBIT",       // Credits deducted for E-Way Bill generation
          "CONTAINER_EWAYBILL",   // Individual container E-Way bill generated
          "FULL_EWAYBILL",        // Full BOE E-Way bill generated
          "EWAYBILL_TRIAL_FREE",  // E-Way Bill generated during 3 Months Free Trial (0 Credits, Saved ₹9)
          "OFFER_ACTIVATION",     // 🎁 3 Months Free Trial introductory offer activated
          "SERVICE_ACTIVATION",   // Service activated / reactivated by SuperAdmin
          "ADMIN_ADJUSTMENT",     // Manual credit grant/adjustment by SuperAdmin
          "EWAYBILL_REWARD",      // Partner incentive reward
          "REVERSAL",             // Credits refunded / rolled back
        ],
        message: "{VALUE} is not a valid transaction type",
      },
      index: true,
    },
    credits: {
      type: Number,
      required: [true, "Credits amount is required"],
      default: 0,
      // Positive for credit additions, negative for debits, 0 for Free Trial
    },
    moneySaved: {
      type: Number,
      default: 0,
      // Track how much money client saved via 3 months free trial (1 Credit = ₹9 per bill)
    },
    balanceAfter: {
      type: Number,
      required: [true, "Balance after transaction is required"],
      default: 0,
    },
    referenceModel: {
      type: String,
      enum: [
        "PaymentRequest",
        "OtherEwayBill",
        "EwayBill",
        "Job",
        "AdminAdjustment",
        "ServiceStatus",
        null,
      ],
      default: null,
    },
    referenceId: {
      type: String,
      default: "",
      index: true,
    },
    boeNo: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    containerNo: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    ewayBillNo: {
      type: String,
      trim: true,
      default: "",
    },
    vehicleNo: {
      type: String,
      trim: true,
      default: "",
    },
    mode: {
      type: String,
      enum: ["CONTAINER", "FULL", "ADMIN", "TOPUP", "SYSTEM", "OTHER"],
      default: "OTHER",
    },
    isFreeTrial: {
      type: Boolean,
      default: false,
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
    performedBy: {
      type: String,
      trim: true,
      default: "System",
    },
  },
  {
    timestamps: true,
    collection: "ewaybillcredithistory", // Explicitly use collection name requested by user
  }
);

// Compound indexes for rapid searches and pagination
ewayBillCreditHistorySchema.index({ clientId: 1, createdAt: -1 });
ewayBillCreditHistorySchema.index({ boeNo: 1, containerNo: 1 });
ewayBillCreditHistorySchema.index({ ewayBillNo: 1 });
ewayBillCreditHistorySchema.index({ clientId: 1, transactionType: 1 });

const EwayBillCreditHistory =
  mongoose.models.EwayBillCreditHistory ||
  mongoose.model("EwayBillCreditHistory", ewayBillCreditHistorySchema);

export default EwayBillCreditHistory;
