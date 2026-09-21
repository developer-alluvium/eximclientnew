import mongoose from "mongoose";

/**
 * ClientWallet Schema
 * Represents the credit balance for a tenant/client account.
 * 
 * Invariants:
 * - availableCredits >= 0
 * - blockedCredits >= 0
 * - effectiveBalance = availableCredits - blockedCredits (Spendable Credits)
 */
const clientWalletSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EximclientUser",
      required: [true, "Client ID is required"],
      unique: true,
      index: true,
    },
    availableCredits: {
      type: Number,
      default: 0,
      min: [0, "Available credits cannot be negative"],
      required: true,
    },
    blockedCredits: {
      type: Number,
      default: 0,
      min: [0, "Blocked credits cannot be negative"],
      required: true,
    },
    activationDate: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months default activation
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * Virtual: effectiveBalance
 * Spendable credits currently unencumbered by pending in-flight transactions.
 */
clientWalletSchema.virtual("effectiveBalance").get(function () {
  return Math.max(0, (this.availableCredits || 0) - (this.blockedCredits || 0));
});

/**
 * Virtual: isExpired
 * Whether current time exceeds validUntil.
 */
clientWalletSchema.virtual("isExpired").get(function () {
  if (!this.validUntil) return false;
  return new Date() > new Date(this.validUntil);
});

/**
 * Virtual: daysRemaining
 * Number of days until validUntil expiration (negative if already expired).
 */
clientWalletSchema.virtual("daysRemaining").get(function () {
  if (!this.validUntil) return null;
  const diff = new Date(this.validUntil).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

/**
 * Instance method to get effective balance
 * @returns {number}
 */
clientWalletSchema.methods.getEffectiveBalance = function () {
  return Math.max(0, (this.availableCredits || 0) - (this.blockedCredits || 0));
};

const ClientWallet = mongoose.model("ClientWallet", clientWalletSchema);

export default ClientWallet;
