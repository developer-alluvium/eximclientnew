import mongoose from "mongoose";
import ClientWallet from "../models/ClientWallet.js";
import CreditLedger from "../models/CreditLedger.js";
import PaymentRequest from "../models/PaymentRequest.js";

/**
 * Custom Error for insufficient credit balances
 */
export class InsufficientCreditsError extends Error {
  constructor(message, available = 0, required = 0) {
    super(message);
    this.name = "InsufficientCreditsError";
    this.code = "INSUFFICIENT_CREDITS";
    this.available = available;
    this.required = required;
    this.status = 402; // Payment Required
  }
}

/**
 * Custom Error for expired service validity
 */
export class WalletExpiredError extends Error {
  constructor(message, validUntil = null) {
    super(message);
    this.name = "WalletExpiredError";
    this.code = "WALLET_EXPIRED";
    this.validUntil = validUntil;
    this.status = 403; // Forbidden
  }
}

/**
 * Ensures a client wallet exists; creates one with 3 months activation validity if not present.
 * @param {string|mongoose.Types.ObjectId} clientId 
 * @param {mongoose.ClientSession|null} session 
 * @returns {Promise<Document>}
 */
export const getOrCreateWallet = async (clientId, session = null) => {
  let wallet = await ClientWallet.findOne({ clientId }).session(session);
  if (!wallet) {
    // First time client active: provide 3 months (90 days) activation
    const validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    wallet = new ClientWallet({
      clientId,
      availableCredits: 0,
      blockedCredits: 0,
      activationDate: new Date(),
      validUntil,
    });
    await wallet.save({ session });
  } else if (!wallet.validUntil) {
    // Backfill 3 months validity if not present
    wallet.validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    wallet.activationDate = wallet.activationDate || new Date();
    await wallet.save({ session });
  }
  return wallet;
};

/**
 * Check if the client has enough effective balance and atomically block the credits.
 * Also verifies that the client's service validity has not expired.
 * Equivalent to SELECT ... FOR UPDATE pattern using atomic findOneAndUpdate.
 * 
 * Condition:
 * (availableCredits - blockedCredits) >= amount && validUntil >= now
 * 
 * @param {string|mongoose.Types.ObjectId} clientId - The tenant/account identifier
 * @param {number} amount - Number of credits to block
 * @param {string} refId - Reference identifier (e.g. BOE Number, Document No)
 * @param {mongoose.ClientSession|null} session - Optional active session
 * @returns {Promise<Document>} The updated ClientWallet document
 * @throws {WalletExpiredError|InsufficientCreditsError}
 */
export const checkAndBlockCredits = async (clientId, amount, refId, session = null) => {
  // Ensure wallet exists and check account validity date
  const currentWallet = await getOrCreateWallet(clientId, session);
  if (currentWallet.validUntil && new Date() > new Date(currentWallet.validUntil)) {
    const expStr = new Date(currentWallet.validUntil).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    throw new WalletExpiredError(
      `Your E-Way Bill service validity expired on ${expStr}. Please recharge / top up your account or contact support to renew your subscription.`,
      currentWallet.validUntil
    );
  }

  if (amount <= 0) {
    return currentWallet;
  }

  // Atomically test and increment blockedCredits only if effective balance is sufficient
  const wallet = await ClientWallet.findOneAndUpdate(
    {
      clientId,
      $expr: {
        $gte: [{ $subtract: ["$availableCredits", "$blockedCredits"] }, amount],
      },
    },
    {
      $inc: { blockedCredits: amount },
    },
    { new: true, session }
  );

  if (!wallet) {
    // Fetch current wallet state to provide accurate diagnostic details in the error
    const current = await ClientWallet.findOne({ clientId }).session(session);
    const available = current ? current.getEffectiveBalance() : 0;
    throw new InsufficientCreditsError(
      `Insufficient credits. You need ${amount} credit(s) to generate this E-Way Bill, but only ${available} credit(s) are available. Please top up your wallet.`,
      available,
      amount
    );
  }

  return wallet;
};

/**
 * Finalize the debit after successful external API execution.
 * Releases blockedCredits and deducts from availableCredits.
 * Records an immutable entry in CreditLedger.
 * 
 * @param {string|mongoose.Types.ObjectId} clientId 
 * @param {number} amount 
 * @param {string} refId 
 * @param {string} [remarks='E-Way Bill Generation'] 
 * @param {mongoose.ClientSession|null} session 
 * @returns {Promise<{ wallet: Document, ledger: Document }>}
 */
export const finalizeDebit = async (clientId, amount, refId, remarks = "E-Way Bill Generation", session = null) => {
  if (amount <= 0) {
    const wallet = await getOrCreateWallet(clientId, session);
    return { wallet, ledger: null };
  }

  const wallet = await ClientWallet.findOneAndUpdate(
    {
      clientId,
      blockedCredits: { $gte: amount },
      availableCredits: { $gte: amount },
    },
    {
      $inc: {
        availableCredits: -amount,
        blockedCredits: -amount,
      },
    },
    { new: true, session }
  );

  if (!wallet) {
    throw new Error(
      `Failed to finalize debit for client ${clientId}. Inconsistent blocked credits state.`
    );
  }

  const [ledger] = await CreditLedger.create(
    [
      {
        clientId,
        transactionType: "EWAYBILL_DEBIT",
        credits: -amount,
        balanceAfter: wallet.availableCredits,
        referenceModel: "OtherEwayBill",
        referenceId: refId,
        remarks,
      },
    ],
    { session }
  );

  return { wallet, ledger };
};

/**
 * Rollback previously blocked credits when the downstream API call fails or is cancelled.
 * Decrements blockedCredits, restoring the effectiveBalance.
 * 
 * @param {string|mongoose.Types.ObjectId} clientId 
 * @param {number} amount 
 * @param {string} refId 
 * @param {string} [remarks='Rollback blocked credits'] 
 * @param {mongoose.ClientSession|null} session 
 * @returns {Promise<Document|null>}
 */
export const rollbackBlockedCredits = async (clientId, amount, refId, remarks = "Rollback blocked credits", session = null) => {
  if (amount <= 0) return null;

  const wallet = await ClientWallet.findOneAndUpdate(
    {
      clientId,
      blockedCredits: { $gte: amount },
    },
    {
      $inc: { blockedCredits: -amount },
    },
    { new: true, session }
  );

  return wallet;
};

/**
 * Add reward credits to a client's wallet and write a ledger entry.
 * Used for partner incentive programs (e.g. SFPL + SRCC).
 * 
 * @param {string|mongoose.Types.ObjectId} clientId 
 * @param {number} amount 
 * @param {string} refId 
 * @param {string} [remarks='Reward Incentive'] 
 * @param {mongoose.ClientSession|null} session 
 * @returns {Promise<{ wallet: Document, ledger: Document }>}
 */
export const addRewardCredits = async (clientId, amount, refId, remarks = "Reward Incentive", session = null) => {
  if (amount <= 0) {
    const wallet = await getOrCreateWallet(clientId, session);
    return { wallet, ledger: null };
  }

  const wallet = await ClientWallet.findOneAndUpdate(
    { clientId },
    { $inc: { availableCredits: amount } },
    { new: true, upsert: true, session }
  );

  const [ledger] = await CreditLedger.create(
    [
      {
        clientId,
        transactionType: "EWAYBILL_REWARD",
        credits: amount,
        balanceAfter: wallet.availableCredits,
        referenceModel: "OtherEwayBill",
        referenceId: refId,
        remarks,
      },
    ],
    { session }
  );

  return { wallet, ledger };
};

/**
 * Approve a pending manual payment request.
 * Atomically marks the PaymentRequest as APPROVED, deposits credits, and records in CreditLedger.
 * 
 * @param {string|mongoose.Types.ObjectId} paymentId 
 * @param {string|mongoose.Types.ObjectId} adminId 
 * @returns {Promise<{ payment: Document, wallet: Document, ledger: Document }>}
 */
export const approvePayment = async (paymentId, adminId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const payment = await PaymentRequest.findOneAndUpdate(
      { _id: paymentId, status: "PENDING" },
      {
        $set: {
          status: "APPROVED",
          approvedBy: adminId,
          approvedAt: new Date(),
        },
      },
      { new: true, session }
    );

    if (!payment) {
      throw new Error("Payment request not found or has already been processed.");
    }

    const currentW = await getOrCreateWallet(payment.clientId, session);
    let newValidUntil;
    if (!currentW.validUntil || new Date() > new Date(currentW.validUntil)) {
      newValidUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 3 months from now
    } else {
      newValidUntil = new Date(new Date(currentW.validUntil).getTime() + 90 * 24 * 60 * 60 * 1000); // Add 3 months to existing
    }

    const wallet = await ClientWallet.findOneAndUpdate(
      { clientId: payment.clientId },
      {
        $inc: { availableCredits: payment.creditsRequested },
        $set: { validUntil: newValidUntil },
      },
      { new: true, upsert: true, session }
    );

    const [ledger] = await CreditLedger.create(
      [
        {
          clientId: payment.clientId,
          transactionType: "PAYMENT_CREDIT",
          credits: payment.creditsRequested,
          balanceAfter: wallet.availableCredits,
          referenceModel: "PaymentRequest",
          referenceId: payment._id,
          remarks: `Payment approved by Admin (${adminId}). Amount: ₹${payment.amountInr}, UTR: ${payment.utrNumber}. Validity extended to ${newValidUntil.toLocaleDateString("en-IN")}.`,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return { payment, wallet, ledger };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Admin manual credit adjustment (Credit or Debit a client's wallet).
 * Supports extending or setting service validity date upon top-up.
 * 
 * @param {string|mongoose.Types.ObjectId} clientId - The client account ID
 * @param {number} creditsDelta - Positive to add credits, negative to deduct
 * @param {string} remarks - Reason for adjustment
 * @param {string|mongoose.Types.ObjectId} adminId - The admin user ID performing action
 * @param {number|null} [extendDays=null] - Days to extend validity
 * @param {string|Date|null} [newValidUntilDate=null] - Specific target validity date
 * @returns {Promise<{ wallet: Document, ledger: Document }>}
 */
export const adminAdjustCredits = async (
  clientId,
  creditsDelta,
  remarks,
  adminId,
  extendDays = null,
  newValidUntilDate = null
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const currentWallet = await getOrCreateWallet(clientId, session);

    if (creditsDelta < 0 && (currentWallet.availableCredits + creditsDelta) < 0) {
      throw new Error(`Cannot deduct ${Math.abs(creditsDelta)} credits. Client currently only has ${currentWallet.availableCredits} credits.`);
    }

    const updateOps = {
      $inc: { availableCredits: creditsDelta },
    };

    // Calculate validity extension / date adjustment
    let computedValidUntil = null;
    if (newValidUntilDate) {
      computedValidUntil = new Date(newValidUntilDate);
    } else if (extendDays !== null && extendDays !== undefined && Number(extendDays) > 0) {
      const days = Number(extendDays);
      if (!currentWallet.validUntil || new Date() > new Date(currentWallet.validUntil)) {
        computedValidUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      } else {
        computedValidUntil = new Date(new Date(currentWallet.validUntil).getTime() + days * 24 * 60 * 60 * 1000);
      }
    } else if (creditsDelta > 0) {
      // Automatic top-up concept: if wallet is expired or has no validity, grant 3 months (90 days)
      if (!currentWallet.validUntil || new Date() > new Date(currentWallet.validUntil)) {
        computedValidUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      }
    }

    if (computedValidUntil && !isNaN(computedValidUntil.getTime())) {
      updateOps.$set = { validUntil: computedValidUntil };
    }

    const wallet = await ClientWallet.findOneAndUpdate(
      { clientId },
      updateOps,
      { new: true, upsert: true, session }
    );

    const [ledger] = await CreditLedger.create(
      [
        {
          clientId,
          transactionType: "ADMIN_ADJUSTMENT",
          credits: creditsDelta,
          balanceAfter: wallet.availableCredits,
          referenceModel: "AdminAdjustment",
          referenceId: adminId,
          remarks:
            remarks ||
            `Admin manual adjustment (${creditsDelta > 0 ? "+" : ""}${creditsDelta} credits)${
              computedValidUntil ? ` [Validity: ${computedValidUntil.toLocaleDateString("en-IN")}]` : ""
            }`,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return { wallet, ledger };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Set custom service validity date for a client.
 * 
 * @param {string|mongoose.Types.ObjectId} clientId 
 * @param {string|Date} validUntilDate 
 * @param {string|mongoose.Types.ObjectId} adminId 
 * @returns {Promise<Document>}
 */
export const setWalletValidity = async (clientId, validUntilDate, adminId) => {
  const dateObj = new Date(validUntilDate);
  if (isNaN(dateObj.getTime())) {
    throw new Error("Invalid validity date provided.");
  }

  const wallet = await ClientWallet.findOneAndUpdate(
    { clientId },
    { $set: { validUntil: dateObj } },
    { new: true, upsert: true }
  );

  return wallet;
};

/**
 * Dynamic Pricing Rule Resolver.
 * Evaluates whether standard commercial tier or SFPL+SRCC incentive tier applies.
 * 
 * Business Rules:
 * - Default / Commercial Clients: debit = 1, reward = 0
 * - Own Clients with SFPL + SRCC = TRUE: debit = 0, reward = 1
 *   (SRCC Transporters: "SRCC", "SR CONTAINER CARRIERS")
 * 
 * @param {Object} client - User / Client object from req.user
 * @param {Object} context - Request body containing formData, job, container details
 * @returns {Promise<{ debit: number, reward: number, tier: string, reason: string }>}
 */
export const getPricingRule = async (client, context = {}) => {
  try {
    const formData = context.formData || context || {};
    const transporter = (
      formData.transporterName ||
      formData.transporter ||
      context.transporter ||
      ""
    ).trim().toUpperCase();

    // Check SRCC Transporter Flag
    const srccKeywords = ["SRCC", "SR CONTAINER CARRIERS"];
    const isSrccTransporter = srccKeywords.some((keyword) =>
      transporter.includes(keyword)
    );

    // Check SFPL Client / Branch Flag
    // Can be configured on client account, branch AMD, or job/company prefix
    const isSfplClient = Boolean(
      client?.isSfplClient ||
      client?.companyName?.toUpperCase()?.includes("SHANTILAL") ||
      client?.companyName?.toUpperCase()?.includes("SFPL") ||
      formData.branchCode === "AMD" ||
      (typeof formData.jobNumber === "string" && formData.jobNumber.startsWith("AMD/"))
    );

    if (isSfplClient && isSrccTransporter) {
      return {
        debit: 0,
        reward: 1,
        tier: "SFPL_SRCC_PARTNER",
        reason: "SFPL + SRCC Partner Incentive (0 Debit, +1 Reward Credit)",
      };
    }

    // Standard SaaS Commercial Tier
    return {
      debit: 1,
      reward: 0,
      tier: "STANDARD_COMMERCIAL",
      reason: "Standard Tier (1 Credit per E-Way Bill)",
    };
  } catch (err) {
    console.error("Error evaluating pricing rule, defaulting to standard:", err);
    return {
      debit: 1,
      reward: 0,
      tier: "STANDARD_COMMERCIAL",
      reason: "Standard Fallback Tier (1 Credit)",
    };
  }
};
