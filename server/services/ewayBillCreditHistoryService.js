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
 * Automatically synchronize any generated E-Way Bills (from `ewaybills` or `otherewaybills` collections)
 * for this client or their assigned importer/company into `ewaybillcredithistory`.
 *
 * @param {string} clientId
 * @returns {Promise<Array<string|ObjectId>>} Array of related clientIds
 */
export const syncEwayBillsForClient = async (clientId) => {
  try {
    if (!clientId) return [clientId];

    const db = mongoose.connection.db;
    if (!db) return [clientId];

    const clientObjectId = mongoose.Types.ObjectId.isValid(clientId)
      ? new mongoose.Types.ObjectId(clientId)
      : null;

    // 1. Fetch user to find company / assigned importer names
    const user = await db.collection("eximclientusers").findOne({
      $or: [
        ...(clientObjectId ? [{ _id: clientObjectId }] : []),
        { _id: String(clientId) },
      ],
    });

    const importerNames = [];
    if (user) {
      if (user.assignedImporterName) importerNames.push(user.assignedImporterName);
      (user.ie_code_assignments || []).forEach((a) => {
        if (a.importer_name) importerNames.push(a.importer_name);
      });
      (user.exporter_ie_code_assignments || []).forEach((a) => {
        if (a.importer_name) importerNames.push(a.importer_name);
      });
    }

    // 2. Find any sibling users belonging to the same company
    const relatedClientIds = [String(clientId)];
    if (clientObjectId) relatedClientIds.push(clientObjectId);

    if (importerNames.length > 0) {
      const siblingUsers = await db.collection("eximclientusers").find({
        $or: [
          { assignedImporterName: { $in: importerNames } },
          { "ie_code_assignments.importer_name": { $in: importerNames } },
          { "exporter_ie_code_assignments.importer_name": { $in: importerNames } },
        ],
      }).toArray();

      siblingUsers.forEach((u) => {
        if (u._id) {
          relatedClientIds.push(String(u._id));
          if (mongoose.Types.ObjectId.isValid(u._id)) {
            relatedClientIds.push(new mongoose.Types.ObjectId(u._id));
          }
        }
      });
    }

    // 3. Find all ewaybills from `ewaybills` collection for this client or their company
    const ewbQueryFilters = [
      { clientId: { $in: relatedClientIds } },
      { userId: { $in: relatedClientIds } },
      { generatedBy: { $in: relatedClientIds.map(String) } },
    ];

    importerNames.forEach((name) => {
      const escaped = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
      const regex = new RegExp(`^${escaped}$`, "i");
      ewbQueryFilters.push({ consigneeName: regex });
      ewbQueryFilters.push({ consignorName: regex });
      ewbQueryFilters.push({ "requestPayload.legal_name_of_consignee": regex });
      ewbQueryFilters.push({ "requestPayload.legal_name_of_consignor": regex });
    });

    const ewbs = await db.collection("ewaybills").find({ $or: ewbQueryFilters }).toArray();

    // 4. Also check `otherewaybills` collection
    const otherEwbs = await db.collection("otherewaybills").find({
      $or: [
        { clientId: { $in: relatedClientIds } },
        { user: { $in: relatedClientIds } },
      ],
    }).toArray();

    // Fetch client wallet to know availableCredits
    const wallet = await db.collection("clientwallets").findOne({
      $or: [
        ...(clientObjectId ? [{ clientId: clientObjectId }] : []),
        { clientId: String(clientId) },
      ],
    });
    const currentBalance = wallet?.availableCredits || 0;

    // 5. Ingest any missing ewaybills
    const historyCol = db.collection("ewaybillcredithistory");

    for (const e of ewbs) {
      const ewbNo = String(e.ewbNo || e.responseData?.ewayBillNo || "").trim();
      const docNo = String(e.documentNumber || e.requestPayload?.document_number || "").trim();
      const cleanBoe = docNo ? docNo.split("-CH-")[0].trim() : "";
      const containerNo = String(
        e.containerId ||
        (e.containerIds && e.containerIds[0]) ||
        (docNo.includes("-CH-") ? docNo.split("-CH-")[1] : "")
      ).trim().toUpperCase();
      const refId = containerNo && cleanBoe
        ? `${cleanBoe} / ${containerNo}`
        : (cleanBoe || containerNo || ewbNo);

      const existing = await historyCol.findOne({
        $or: [
          ...(ewbNo ? [{ ewayBillNo: ewbNo }] : []),
          { referenceId: refId },
          ...(containerNo && cleanBoe ? [{ boeNo: cleanBoe, containerNo }] : []),
        ],
      });

      if (!existing) {
        const isFree = true;
        const entryDate = e.createdAt || e.generatedAt || new Date();
        await historyCol.insertOne({
          clientId: clientObjectId || clientId,
          transactionType: "EWAYBILL_TRIAL_FREE",
          credits: 0,
          moneySaved: 9,
          balanceAfter: currentBalance,
          referenceModel: "EwayBill",
          referenceId: refId,
          boeNo: cleanBoe,
          containerNo,
          ewayBillNo: ewbNo,
          vehicleNo: e.vehicleNo || e.requestPayload?.vehicle_number || "",
          mode: containerNo ? "CONTAINER" : "FULL",
          isFreeTrial: isFree,
          remarks: `🎁 3 Months Free Trial: ${containerNo ? `Container ${containerNo}` : "E-Way Bill"} Generated (EWB: ${ewbNo || "Verified Active"}) - Saved ₹9`,
          performedBy: user?.email || "System",
          createdAt: entryDate,
          updatedAt: entryDate,
        });
      }
    }

    // 6. Ingest any missing containers from `otherewaybills`
    for (const o of otherEwbs) {
      const containers = (o.containers || []).filter(c => c.ewayBillStatus === "Generated" && c.ewayBillNo);
      for (const cont of containers) {
        const contRef = `${o.boeNumber} / ${cont.containerNumber}`;
        const existing = await historyCol.findOne({
          $or: [
            { ewayBillNo: String(cont.ewayBillNo) },
            { referenceId: contRef },
            { boeNo: o.boeNumber, containerNo: cont.containerNumber },
          ],
        });

        if (!existing) {
          const entryDate = cont.ewayBillDate || o.createdAt || new Date();
          await historyCol.insertOne({
            clientId: clientObjectId || clientId,
            transactionType: "EWAYBILL_TRIAL_FREE",
            credits: 0,
            moneySaved: 9,
            balanceAfter: currentBalance,
            referenceModel: "OtherEwayBill",
            referenceId: contRef,
            boeNo: o.boeNumber || "",
            containerNo: cont.containerNumber || "",
            ewayBillNo: String(cont.ewayBillNo),
            vehicleNo: cont.vehicleNo || o.vehicleNo || "",
            mode: "CONTAINER",
            isFreeTrial: true,
            remarks: `🎁 3 Months Free Trial: Container E-Way Bill Generated (Cont: ${cont.containerNumber}, EWB: ${cont.ewayBillNo}) - Saved ₹9`,
            performedBy: user?.email || "System",
            createdAt: entryDate,
            updatedAt: entryDate,
          });
        }
      }
    }

    return relatedClientIds;
  } catch (err) {
    console.error("⚠️ [CreditHistory] Error syncing E-Way Bills for client:", err);
    return [clientId];
  }
};

/**
 * Fetch paginated history from ewaybillcredithistory collection
 * with complete summary calculations (money saved, free trial count, etc.)
 */
export const getClientCreditHistory = async (clientId, query = {}) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 15;
  const skip = (page - 1) * limit;

  // Auto-sync any E-Way Bills for this client and their company before querying
  const relatedClientIds = await syncEwayBillsForClient(clientId);

  const clientObjectId = mongoose.Types.ObjectId.isValid(clientId)
    ? new mongoose.Types.ObjectId(clientId)
    : null;

  const matchIds = [
    clientId,
    String(clientId),
    ...(clientObjectId ? [clientObjectId] : []),
    ...(relatedClientIds || [])
  ];

  const baseClientFilter = { clientId: { $in: matchIds } };

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
