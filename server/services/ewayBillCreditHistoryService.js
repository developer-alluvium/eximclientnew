import mongoose from "mongoose";
import EwayBillCreditHistory from "../models/EwayBillCreditHistory.js";
import CreditLedger from "../models/CreditLedger.js";
import ClientWallet from "../models/ClientWallet.js";

const RATE_PER_EWAYBILL_INR = 9; // 1 Credit = ₹9

/**
 * Record a financial or operational transaction in EwayBillCreditHistory
 * (and dual-write to CreditLedger for backward compatibility).
 * 
 * @param {Object} data 
 * @returns {Promise<Document>}
 */
export const recordCreditHistory = async (data) => {
  try {
    const {
      clientId,
      transactionType,
      credits = 0,
      balanceAfter = 0,
      referenceModel = null,
      referenceId = "",
      boeNo = "",
      containerNo = "",
      ewayBillNo = "",
      vehicleNo = "",
      mode = "CONTAINER",
      isFreeTrial = false,
      moneySaved = 0,
      remarks = "",
      performedBy = "System",
    } = data;

    if (!clientId) {
      console.warn("⚠️ [CreditHistory] Cannot record entry without clientId");
      return null;
    }

    // Auto-compute money saved for 3 Months Free Trial
    let computedSavings = Number(moneySaved) || 0;
    if (computedSavings === 0 && (isFreeTrial || transactionType === "EWAYBILL_TRIAL_FREE")) {
      computedSavings = RATE_PER_EWAYBILL_INR;
    }

    // Prepare clean string identifiers
    const cleanBoe = boeNo ? String(boeNo).split("-CH-")[0].trim() : "";
    const cleanContainer = containerNo ? String(containerNo).trim().toUpperCase() : "";
    const cleanEwb = ewayBillNo ? String(ewayBillNo).trim() : "";
    const cleanRefId = referenceId
      ? String(referenceId).trim()
      : cleanBoe && cleanContainer
      ? `${cleanBoe} / ${cleanContainer}`
      : cleanContainer || cleanBoe || cleanEwb || "REF_GEN";

    // Format rich remarks if default provided
    let finalRemarks = remarks;
    if (!finalRemarks) {
      if (isFreeTrial || transactionType === "EWAYBILL_TRIAL_FREE") {
        finalRemarks = `🎁 3 Months Free Trial: ${cleanContainer ? `Container ${cleanContainer}` : "E-Way Bill"} Generated (EWB: ${cleanEwb || "Verified Active"}) - Saved ₹${computedSavings}`;
      } else if (transactionType === "CONTAINER_EWAYBILL" || transactionType === "EWAYBILL_DEBIT") {
        finalRemarks = `E-Way Bill Generated for Container ${cleanContainer || "All"} (EWB: ${cleanEwb || "N/A"}) - ${Math.abs(credits)} Cr Debited`;
      } else if (transactionType === "ADMIN_ADJUSTMENT") {
        finalRemarks = `Credit Allocation: ${credits >= 0 ? `+${credits}` : credits} Credits adjusted by SuperAdmin`;
      } else if (transactionType === "OFFER_ACTIVATION") {
        finalRemarks = "🎁 Introductory Offer Activated: 3 Months Free Trial (Valid for 90 days)";
      }
    }

    // 1. Insert into dedicated ewaybillcredithistory collection
    const historyRecord = await EwayBillCreditHistory.create({
      clientId,
      transactionType,
      credits: Number(credits) || 0,
      moneySaved: computedSavings,
      balanceAfter: Number(balanceAfter) || 0,
      referenceModel,
      referenceId: cleanRefId,
      boeNo: cleanBoe,
      containerNo: cleanContainer,
      ewayBillNo: cleanEwb,
      vehicleNo: vehicleNo ? String(vehicleNo).trim() : "",
      mode,
      isFreeTrial: Boolean(isFreeTrial || transactionType === "EWAYBILL_TRIAL_FREE"),
      remarks: finalRemarks,
      performedBy,
    });

    // 2. Dual-write to CreditLedger (idempotent / backward compatibility)
    try {
      const clientObjectId = mongoose.Types.ObjectId.isValid(clientId)
        ? new mongoose.Types.ObjectId(clientId)
        : null;

      // Map to supported CreditLedger transaction type
      let ledgerType = transactionType;
      if (transactionType === "CONTAINER_EWAYBILL" || transactionType === "FULL_EWAYBILL") {
        ledgerType = isFreeTrial ? "EWAYBILL_TRIAL_FREE" : "EWAYBILL_DEBIT";
      }

      await CreditLedger.create({
        clientId: clientObjectId || clientId,
        transactionType: ledgerType,
        credits: Number(credits) || 0,
        balanceAfter: Number(balanceAfter) || 0,
        referenceModel: referenceModel || "EwayBill",
        referenceId: cleanRefId,
        remarks: finalRemarks,
      });
    } catch (dualErr) {
      // Non-fatal if CreditLedger duplicate or casting issue
      console.warn("Dual-write to CreditLedger notice:", dualErr.message);
    }

    return historyRecord;
  } catch (err) {
    console.error("❌ Error in recordCreditHistory:", err);
    return null;
  }
};

/**
 * Fetch paginated history from ewaybillcredithistory collection
 * with complete summary calculations (money saved, free trial count, etc.)
 * ONLY reads from ewaybillcredithistory collection.
 */
export const getClientCreditHistory = async (clientId, query = {}) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 15;
  const skip = (page - 1) * limit;

  const clientObjectId = mongoose.Types.ObjectId.isValid(clientId)
    ? new mongoose.Types.ObjectId(clientId)
    : null;

  const baseClientFilter = clientObjectId
    ? { $or: [{ clientId: clientObjectId }, { clientId: String(clientId) }] }
    : { clientId: String(clientId) };

  const andConditions = [baseClientFilter];

  // Filter by Type
  if (query.type && query.type !== "ALL") {
    if (query.type === "EWAYBILL_TRIAL_FREE") {
      andConditions.push({
        $or: [
          { transactionType: "EWAYBILL_TRIAL_FREE" },
          { isFreeTrial: true },
        ],
      });
    } else if (query.type === "DEBITS" || query.type === "EWAYBILL_DEBIT") {
      andConditions.push({
        transactionType: {
          $in: ["EWAYBILL_DEBIT", "CONTAINER_EWAYBILL", "FULL_EWAYBILL"],
        },
      });
    } else if (query.type === "CONTAINER_EWAYBILL") {
      andConditions.push({
        $or: [
          { transactionType: "CONTAINER_EWAYBILL" },
          { containerNo: { $ne: "" } },
        ],
      });
    } else {
      andConditions.push({ transactionType: query.type });
    }
  }

  // Filter by Search Query
  if (query.search && query.search.trim()) {
    const searchRegex = new RegExp(query.search.trim(), "i");
    andConditions.push({
      $or: [
        { remarks: searchRegex },
        { boeNo: searchRegex },
        { containerNo: searchRegex },
        { ewayBillNo: searchRegex },
        { referenceId: searchRegex },
        { vehicleNo: searchRegex },
      ],
    });
  }

  const filter = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

  const [transactions, total, statsAgg] = await Promise.all([
    EwayBillCreditHistory.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    EwayBillCreditHistory.countDocuments(filter),
    EwayBillCreditHistory.aggregate([
      { $match: baseClientFilter },
      {
        $group: {
          _id: null,
          totalMoneySaved: { $sum: "$moneySaved" },
          totalFreeTrialEwbs: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ["$transactionType", "EWAYBILL_TRIAL_FREE"] },
                    { $eq: ["$isFreeTrial", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalContainers: {
            $sum: {
              $cond: [{ $ne: ["$containerNo", ""] }, 1, 0],
            },
          },
          totalCreditsDebited: {
            $sum: {
              $cond: [{ $lt: ["$credits", 0] }, { $abs: "$credits" }, 0],
            },
          },
          totalCreditsDeposited: {
            $sum: {
              $cond: [{ $gt: ["$credits", 0] }, "$credits", 0],
            },
          },
        },
      },
    ]),
  ]);

  const summary = statsAgg[0] || {
    totalMoneySaved: 0,
    totalFreeTrialEwbs: 0,
    totalContainers: 0,
    totalCreditsDebited: 0,
    totalCreditsDeposited: 0,
  };

  return {
    transactions,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit) || 1,
    summary,
  };
};
