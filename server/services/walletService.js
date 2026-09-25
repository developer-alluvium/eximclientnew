import mongoose from "mongoose";
import ClientWallet from "../models/ClientWallet.js";
import CreditLedger from "../models/CreditLedger.js";
import PaymentRequest from "../models/PaymentRequest.js";
import { recordCreditHistory } from "./ewayBillCreditHistoryService.js";

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
 * Custom Error for inactive wallet service
 */
export class WalletServiceInactiveError extends Error {
  constructor(
    message = "E-Way Bill wallet service is currently inactive for this account. Please contact SuperAdmin (superadmin@exim.com) to activate your service."
  ) {
    super(message);
    this.name = "WalletServiceInactiveError";
    this.code = "WALLET_SERVICE_INACTIVE";
    this.status = 403; // Forbidden
  }
}

/**
 * Ensures a client wallet exists; creates one with INACTIVE initial status if not present.
 * @param {string|mongoose.Types.ObjectId} clientId 
 * @param {mongoose.ClientSession|null} session 
 * @returns {Promise<Document>}
 */
export const getOrCreateWallet = async (clientId, session = null) => {
  let wallet = await ClientWallet.findOne({ clientId }).session(session);
  if (!wallet) {
    wallet = new ClientWallet({
      clientId,
      availableCredits: 0,
      blockedCredits: 0,
      walletServiceStatus: "INACTIVE",
      isFirstTimeActivated: false,
      firstActivatedAt: null,
      activationDate: new Date(),
      validUntil: null,
    });
    await wallet.save({ session });
  }
  return wallet;
};

/**
 * Check if the client has enough effective balance and atomically block the credits.
 * Also verifies that the client's wallet service is ACTIVE and has not expired.
 * Equivalent to SELECT ... FOR UPDATE pattern using atomic findOneAndUpdate.
 * 
 * Condition:
 * walletServiceStatus === 'ACTIVE' && (availableCredits - blockedCredits) >= amount && validUntil >= now
 * 
 * @param {string|mongoose.Types.ObjectId} clientId - The tenant/account identifier
 * @param {number} amount - Number of credits to block
 * @param {string} refId - Reference identifier (e.g. BOE Number, Document No)
 * @param {mongoose.ClientSession|null} session - Optional active session
 * @returns {Promise<Document>} The updated ClientWallet document
 * @throws {WalletServiceInactiveError|WalletExpiredError|InsufficientCreditsError}
 */
export const checkAndBlockCredits = async (clientId, amount, refId, session = null) => {
  // Ensure wallet exists and check account validity date
  const currentWallet = await getOrCreateWallet(clientId, session);

  // 1. Verify that E-Way Bill Wallet Service is ACTIVE
  if (currentWallet.walletServiceStatus === "INACTIVE") {
    throw new WalletServiceInactiveError(
      "E-Way Bill wallet service is currently inactive for this account. Please contact SuperAdmin (superadmin@exim.com) to activate your service."
    );
  }

  // 2. Verify validity date
  if (currentWallet.validUntil && new Date() > new Date(currentWallet.validUntil)) {
    const expStr = new Date(currentWallet.validUntil).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    throw new WalletExpiredError(
      `Your E-Way Bill service validity expired on ${expStr}. Please contact SuperAdmin (superadmin@exim.com) to renew your subscription.`,
      currentWallet.validUntil
    );
  }

  if (amount <= 0) {
    return currentWallet;
  }

  const clientObjectId = mongoose.Types.ObjectId.isValid(clientId)
    ? new mongoose.Types.ObjectId(clientId)
    : null;
  const clientFilter = clientObjectId
    ? { $in: [clientObjectId, String(clientId)] }
    : String(clientId);

  // Atomically test and increment blockedCredits only if effective balance is sufficient
  const wallet = await ClientWallet.findOneAndUpdate(
    {
      clientId: clientFilter,
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
    const current = await ClientWallet.findOne({ clientId: clientFilter }).session(session);
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

  const clientObjectId = mongoose.Types.ObjectId.isValid(clientId)
    ? new mongoose.Types.ObjectId(clientId)
    : null;
  const clientFilter = clientObjectId
    ? { $in: [clientObjectId, String(clientId)] }
    : String(clientId);

  // Find and update with fallback to availableCredits deduction if blocked was 0
  let wallet = await ClientWallet.findOneAndUpdate(
    {
      clientId: clientFilter,
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
    // Fallback: in case blocked credits were already 0 or bypassed, deduct availableCredits directly
    wallet = await ClientWallet.findOneAndUpdate(
      {
        clientId: clientFilter,
        availableCredits: { $gte: amount },
      },
      {
        $inc: { availableCredits: -amount },
      },
      { new: true, session }
    );
  }

  if (!wallet) {
    throw new Error(
      `Failed to finalize debit for client ${clientId}. Inconsistent credit balance state.`
    );
  }

  const [ledger] = await CreditLedger.create(
    [
      {
        clientId: wallet.clientId,
        transactionType: "EWAYBILL_DEBIT",
        credits: -amount,
        balanceAfter: wallet.availableCredits,
        referenceModel: "EwayBill",
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

  const clientObjectId = mongoose.Types.ObjectId.isValid(clientId)
    ? new mongoose.Types.ObjectId(clientId)
    : null;
  const clientFilter = clientObjectId
    ? { $in: [clientObjectId, String(clientId)] }
    : String(clientId);

  const wallet = await ClientWallet.findOneAndUpdate(
    {
      clientId: clientFilter,
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

    // Record in EwayBillCreditHistory
    try {
      await recordCreditHistory({
        clientId: payment.clientId,
        transactionType: "PAYMENT_CREDIT",
        credits: payment.creditsRequested,
        balanceAfter: wallet.availableCredits,
        referenceModel: "PaymentRequest",
        referenceId: String(payment._id),
        mode: "TOPUP",
        remarks: `Top-Up Deposit approved by Admin (${adminId}). Amount: ₹${payment.amountInr}, UTR: ${payment.utrNumber}. Validity extended to ${newValidUntil.toLocaleDateString("en-IN")}.`,
        performedBy: String(adminId),
      });
    } catch (hErr) {
      console.warn("Could not log payment history:", hErr.message);
    }

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

    // Record in EwayBillCreditHistory
    try {
      const finalRemarks =
        remarks ||
        `Admin manual adjustment (${creditsDelta > 0 ? "+" : ""}${creditsDelta} credits)${
          computedValidUntil ? ` [Validity: ${computedValidUntil.toLocaleDateString("en-IN")}]` : ""
        }`;
      await recordCreditHistory({
        clientId,
        transactionType: "ADMIN_ADJUSTMENT",
        credits: creditsDelta,
        balanceAfter: wallet.availableCredits,
        referenceModel: "AdminAdjustment",
        referenceId: String(adminId),
        mode: "ADMIN",
        remarks: finalRemarks,
        performedBy: String(adminId),
      });
    } catch (hErr) {
      console.warn("Could not log admin adjustment history:", hErr.message);
    }

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

    // Check if client is in 3 Months Free Trial
    let isFreeTrial = false;
    let clientWallet = null;
    const clientId = (
      client?.adminId?._id ||
      client?.adminId ||
      client?._id ||
      client?.id
    )?.toString();

    if (clientId) {
      try {
        clientWallet = await ClientWallet.findOne({ clientId }).lean();
        if (
          clientWallet &&
          clientWallet.walletServiceStatus === "ACTIVE" &&
          clientWallet.isFirstTimeActivated &&
          clientWallet.validUntil &&
          new Date() <= new Date(clientWallet.validUntil)
        ) {
          isFreeTrial = true;
        }
      } catch (wErr) {
        console.warn("Could not check wallet for free trial:", wErr.message);
      }
    }

    if (isSfplClient && isSrccTransporter) {
      return {
        debit: 0,
        reward: 1,
        tier: "SFPL_SRCC_PARTNER",
        isFreeTrial,
        reason: "SFPL + SRCC Partner Incentive (0 Debit, +1 Reward Credit)",
      };
    }

    // 3 Months Free Trial SaaS Tier (0 Credits debited)
    if (isFreeTrial) {
      return {
        debit: 0,
        reward: 0,
        tier: "FREE_TRIAL",
        isFreeTrial: true,
        validUntil: clientWallet?.validUntil,
        daysRemaining: clientWallet?.validUntil
          ? Math.max(0, Math.ceil((new Date(clientWallet.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : null,
        reason: "3 Months Free Trial Active (0 Credits / Free Now)",
      };
    }

    // Standard SaaS Commercial Tier
    return {
      debit: 1,
      reward: 0,
      tier: "STANDARD_COMMERCIAL",
      isFreeTrial: false,
      reason: "Standard Tier (1 Credit per E-Way Bill)",
    };
  } catch (err) {
    console.error("Error evaluating pricing rule, defaulting to standard:", err);
    return {
      debit: 1,
      reward: 0,
      tier: "STANDARD_COMMERCIAL",
      isFreeTrial: false,
      reason: "Standard Fallback Tier (1 Credit)",
    };
  }
};

/**
 * Universal extractor for 12-digit Indian E-Way Bill numbers.
 * Handles all government NIC / Masters India / Transport server response formats.
 * 
 * Supports:
 * - Direct fields: ewbNo, ewayBillNo, ewbNumber, ewayBillNumber, generatedEwbNo, eway_bill_no, ewb_no
 * - Nested objects: responseData, data.responseData, result, results[0], itemList[0]
 * - Message / error parsing: "already generated: 371010885063", "already exists (371010885063)"
 * 
 * @param {any} obj - Response object, array, or string from downstream
 * @returns {string|null} - The extracted 12-digit E-Way Bill number or null
 */
export const extractEwbNumber = (obj) => {
  if (!obj) return null;

  const candidateKeys = [
    "ewbNo",
    "ewayBillNo",
    "ewbNumber",
    "ewayBillNumber",
    "generatedEwbNo",
    "eway_bill_no",
    "ewb_no",
  ];

  // 1. Breadth-first traversal of nested JSON structures
  const queue = [obj];
  const visited = new Set();

  while (queue.length > 0) {
    const curr = queue.shift();
    if (!curr || typeof curr !== "object" || visited.has(curr)) continue;
    visited.add(curr);

    for (const key of candidateKeys) {
      const val = curr[key];
      if (val !== undefined && val !== null) {
        const cleaned = String(val).trim();
        if (/^\d{12}$/.test(cleaned)) {
          return cleaned;
        }
      }
    }

    // Traverse sub-properties
    const subKeys = [
      "data",
      "responseData",
      "response_data",
      "result",
      "results",
      "itemList",
      "item_list",
      "response",
      "payload",
    ];
    for (const sk of subKeys) {
      if (curr[sk] && typeof curr[sk] === "object") {
        queue.push(curr[sk]);
      }
    }

    // Traverse arrays
    if (Array.isArray(curr)) {
      for (const item of curr) {
        if (item && typeof item === "object") queue.push(item);
      }
    }
  }

  // 2. String/Regex extraction on message, error, alert, or status descriptions
  const stringCandidates = [
    obj?.message,
    obj?.error,
    obj?.alert,
    obj?.status_desc,
    obj?.statusDesc,
    obj?.data?.message,
    obj?.data?.error,
    obj?.errors,
  ];

  for (const candidate of stringCandidates) {
    if (!candidate) continue;
    const text = typeof candidate === "string" ? candidate : JSON.stringify(candidate);
    const match = text.match(/\b\d{12}\b/);
    if (match) {
      return match[0];
    }
  }

  return null;
};

/**
 * Toggle E-Way Bill Wallet Service Status (ACTIVE / INACTIVE).
 * ERP Business Rules:
 * - First-time activation grants 3 months (90 days) of free service validity.
 * - Records an immutable audit log entry in serviceStatusHistory.
 * 
 * @param {string|mongoose.Types.ObjectId} clientId 
 * @param {"ACTIVE"|"INACTIVE"} newStatus 
 * @param {string|Object} [adminInfo='SuperAdmin'] 
 * @param {string} [remarks=''] 
 * @returns {Promise<{ wallet: Document, isFirstActivation: boolean }>}
 */
export const toggleWalletServiceStatus = async (
  clientId,
  newStatus,
  adminInfo = "SuperAdmin",
  remarks = ""
) => {
  const normalizedStatus = String(newStatus).toUpperCase();
  if (!["ACTIVE", "INACTIVE"].includes(normalizedStatus)) {
    throw new Error("Invalid wallet service status. Must be 'ACTIVE' or 'INACTIVE'.");
  }

  const wallet = await getOrCreateWallet(clientId);
  const previousStatus = wallet.walletServiceStatus || "INACTIVE";
  let isFirstActivation = false;
  let computedRemarks = remarks;

  if (normalizedStatus === "ACTIVE") {
    // 1. First-Time Activation check
    if (!wallet.isFirstTimeActivated) {
      isFirstActivation = true;
      wallet.isFirstTimeActivated = true;
      wallet.firstActivatedAt = new Date();
      // First-time active: Grant 3 months (90 days) free service
      wallet.validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      if (!computedRemarks) {
        computedRemarks = "First-time service activation: 3 months free trial service activated.";
      }
    } else {
      // 2. Reactivation: If currently expired or validity missing, refresh 3 months validity
      if (!wallet.validUntil || new Date() > new Date(wallet.validUntil)) {
        wallet.validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      }
      if (!computedRemarks) {
        computedRemarks = "Service reactivated by SuperAdmin.";
      }
    }
  } else {
    // Deactivation
    if (!computedRemarks) {
      computedRemarks = "Service deactivated by SuperAdmin.";
    }
  }

  wallet.walletServiceStatus = normalizedStatus;

  // Extract admin name/email for ERP audit trail
  const changedByStr =
    typeof adminInfo === "object" && adminInfo !== null
      ? adminInfo.email || adminInfo.name || adminInfo.id || "SuperAdmin"
      : String(adminInfo || "SuperAdmin");

  if (!wallet.serviceStatusHistory) {
    wallet.serviceStatusHistory = [];
  }

  wallet.serviceStatusHistory.push({
    status: normalizedStatus,
    previousStatus,
    changedBy: changedByStr,
    changedAt: new Date(),
    remarks: computedRemarks,
    validUntil: wallet.validUntil,
    isFirstActivation,
  });

  await wallet.save();

  // Record an immutable CreditLedger entry for audit trail and client ledger visibility
  try {
    if (isFirstActivation) {
      const expDateStr = wallet.validUntil
        ? new Date(wallet.validUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        : "90 days";
      await recordCreditHistory({
        clientId: wallet.clientId,
        transactionType: "OFFER_ACTIVATION",
        credits: 0,
        balanceAfter: wallet.availableCredits || 0,
        referenceModel: "AdminAdjustment",
        referenceId: "PROMO-3M-TRIAL",
        mode: "ADMIN",
        remarks: `🎁 Introductory Offer Activated: 3 Months Free Trial (Valid for 90 days until ${expDateStr}) - Authorized by ${changedByStr}`,
        performedBy: changedByStr,
      });
      console.log(`📜 [Wallet Service] Created Introductory Offer CreditLedger & History record for client ${wallet.clientId}`);
    } else {
      await recordCreditHistory({
        clientId: wallet.clientId,
        transactionType: "SERVICE_ACTIVATION",
        credits: 0,
        balanceAfter: wallet.availableCredits || 0,
        referenceModel: "ServiceStatus",
        referenceId: `STATUS_${normalizedStatus}`,
        mode: "ADMIN",
        remarks: `${normalizedStatus === "ACTIVE" ? "Service Activated" : "Service Deactivated"} by SuperAdmin (${changedByStr}). Remarks: ${computedRemarks}`,
        performedBy: changedByStr,
      });
      console.log(`📜 [Wallet Service] Created Service Status CreditLedger & History record for client ${wallet.clientId}`);
    }
  } catch (ledgerErr) {
    console.warn("Could not record service status CreditLedger entry:", ledgerErr.message);
  }

  return { wallet, isFirstActivation };
};

/**
 * Update Partner Pricing Tier (SFPL + SRCC) and record ERP audit history.
 * Partner Tier is separate from Service Status and determines 0 debit / +1 reward incentive.
 * 
 * @param {string|mongoose.Types.ObjectId} clientId 
 * @param {boolean} isSfplClient 
 * @param {string|Object} [adminInfo='SuperAdmin'] 
 * @param {string} [remarks=''] 
 * @returns {Promise<{ client: Document, wallet: Document }>}
 */
export const updatePartnerTier = async (
  clientId,
  isSfplClient,
  adminInfo = "SuperAdmin",
  remarks = ""
) => {
  const isPartner = Boolean(isSfplClient);
  const wallet = await getOrCreateWallet(clientId);

  const EximclientUser = mongoose.model("EximclientUser");
  const client = await EximclientUser.findById(clientId);
  const previousState = Boolean(client?.isSfplClient);

  if (client) {
    client.isSfplClient = isPartner;
    await client.save();
  }

  // Also sync with Customer / Admin models if present
  try {
    const CustomerModel = mongoose.models.Customer || mongoose.model("Customer");
    await CustomerModel.findByIdAndUpdate(clientId, { $set: { isSfplClient: isPartner } });
  } catch (_) {}
  try {
    const AdminModel = mongoose.models.Admin || mongoose.model("Admin");
    await AdminModel.findByIdAndUpdate(clientId, { $set: { isSfplClient: isPartner } });
  } catch (_) {}

  const changedByStr =
    typeof adminInfo === "object" && adminInfo !== null
      ? adminInfo.email || adminInfo.name || adminInfo.id || "SuperAdmin"
      : String(adminInfo || "SuperAdmin");

  const computedRemarks =
    remarks ||
    (isPartner
      ? "SFPL+SRCC Partner tier enabled by SuperAdmin"
      : "Standard commercial tier enabled by SuperAdmin");

  if (!wallet.partnerTierHistory) {
    wallet.partnerTierHistory = [];
  }

  wallet.partnerTierHistory.push({
    isSfplClient: isPartner,
    previousState,
    changedBy: changedByStr,
    changedAt: new Date(),
    remarks: computedRemarks,
  });

  await wallet.save();
  return { client, wallet };
};

