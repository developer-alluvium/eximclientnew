import mongoose from "mongoose";

/**
 * CreditLedger Schema
 * Immutable append-only financial ledger tracking all credit changes.
 * 
 * Every balance change in ClientWallet MUST have a corresponding CreditLedger entry.
 */
const creditLedgerSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EximclientUser",
      required: [true, "Client ID is required"],
      index: true,
    },
    transactionType: {
      type: String,
      required: [true, "Transaction type is required"],
      enum: {
        values: [
          "PAYMENT_CREDIT",   // Credits deposited from approved payment
          "EWAYBILL_DEBIT",   // Credits deducted for E-Way Bill generation
          "EWAYBILL_REWARD",  // Reward credits (e.g. SFPL + SRCC incentive)
          "ADMIN_ADJUSTMENT", // Manual adjustment by SuperAdmin
          "REVERSAL",         // Transaction reversed / refunded
          "EWAYBILL_TRIAL_FREE", // E-Way Bill generated during 3 Months Free Trial (0 Credits)
          "OFFER_ACTIVATION", // Promotional offer / 3 Months Free Trial activation
          "SERVICE_ACTIVATION", // Service activated / reactivated by SuperAdmin
        ],
        message: "{VALUE} is not a valid transaction type",
      },
      index: true,
    },
    credits: {
      type: Number,
      required: [true, "Credits amount is required"],
      // Positive for credit additions, negative for debits
    },
    balanceAfter: {
      type: Number,
      required: [true, "Balance after transaction is required"],
      min: [0, "Balance after cannot be negative"],
    },
    referenceModel: {
      type: String,
      enum: ["PaymentRequest", "OtherEwayBill", "EwayBill", "Job", "AdminAdjustment", "ServiceStatus", null],
      default: null,
    },
    referenceId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      index: true,
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for audit queries & idempotency lookups
creditLedgerSchema.index({ clientId: 1, createdAt: -1 });
creditLedgerSchema.index({ referenceId: 1, transactionType: 1 });

const CreditLedger = mongoose.model("CreditLedger", creditLedgerSchema);

export default CreditLedger;
