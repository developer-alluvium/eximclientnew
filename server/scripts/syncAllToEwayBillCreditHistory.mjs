import '../fix-dns.js';
import mongoose from 'mongoose';

const dbUri = process.env.MONGODB_URI || 'mongodb+srv://react_db_user:m5o1X7QnWdAKeuu5@cluster0.tcmfe6d.mongodb.net/exim';
await mongoose.connect(dbUri);

console.log("Connected to MongoDB for syncing EwayBillCreditHistory collection...");

const ewayBillCreditHistoryCol = mongoose.connection.db.collection('ewaybillcredithistory');
const creditLedgerCol = mongoose.connection.db.collection('creditledgers');
const walletsCol = mongoose.connection.db.collection('clientwallets');
const otherEwbsCol = mongoose.connection.db.collection('otherewaybills');
const jobsCol = mongoose.connection.db.collection('jobs');
const usersCol = mongoose.connection.db.collection('eximclientusers');

// Ensure indexes on ewaybillcredithistory
await ewayBillCreditHistoryCol.createIndex({ clientId: 1, createdAt: -1 });
await ewayBillCreditHistoryCol.createIndex({ boeNo: 1, containerNo: 1 });
await ewayBillCreditHistoryCol.createIndex({ ewayBillNo: 1 });
await ewayBillCreditHistoryCol.createIndex({ referenceId: 1 });

let totalInserted = 0;

// 1. Sync all existing CreditLedger entries into ewaybillcredithistory
const allLedgers = await creditLedgerCol.find({}).toArray();
console.log(`Found ${allLedgers.length} existing CreditLedger entries to inspect...`);

for (const cl of allLedgers) {
  const existing = await ewayBillCreditHistoryCol.findOne({
    clientId: cl.clientId,
    referenceId: cl.referenceId,
    transactionType: cl.transactionType,
  });

  if (!existing) {
    const isFree = cl.transactionType === "EWAYBILL_TRIAL_FREE";
    await ewayBillCreditHistoryCol.insertOne({
      clientId: cl.clientId,
      transactionType: cl.transactionType,
      credits: cl.credits || 0,
      moneySaved: isFree ? 9 : 0,
      balanceAfter: cl.balanceAfter || 0,
      referenceModel: cl.referenceModel || "OtherEwayBill",
      referenceId: cl.referenceId || "REF_SYNC",
      boeNo: String(cl.referenceId || "").split(" / ")[0] || "",
      containerNo: String(cl.referenceId || "").split(" / ")[1] || "",
      ewayBillNo: "",
      vehicleNo: "",
      mode: "SYSTEM",
      isFreeTrial: isFree,
      remarks: cl.remarks || "",
      performedBy: "SuperAdmin",
      createdAt: cl.createdAt || new Date(),
      updatedAt: cl.updatedAt || new Date(),
    });
    totalInserted++;
  }
}

// 2. Sync all OtherEwayBill records (including each individual container!)
const allOtherEwbs = await otherEwbsCol.find({}).toArray();
console.log(`Found ${allOtherEwbs.length} OtherEwayBill documents to inspect...`);

for (const o of allOtherEwbs) {
  if (!o.clientId) continue;

  const containers = o.containers || [];
  const generatedContainers = containers.filter(c => c.ewayBillStatus === "Generated" && c.ewayBillNo);

  if (generatedContainers.length > 0) {
    for (const cont of generatedContainers) {
      const contRef = `${o.boeNumber} / ${cont.containerNumber}`;
      const existing = await ewayBillCreditHistoryCol.findOne({
        clientId: o.clientId,
        $or: [
          { ewayBillNo: cont.ewayBillNo },
          { referenceId: contRef },
          { boeNo: o.boeNumber, containerNo: cont.containerNumber },
        ],
      });

      if (!existing) {
        await ewayBillCreditHistoryCol.insertOne({
          clientId: o.clientId,
          transactionType: "EWAYBILL_TRIAL_FREE",
          credits: 0,
          moneySaved: 9,
          balanceAfter: 0,
          referenceModel: "OtherEwayBill",
          referenceId: contRef,
          boeNo: o.boeNumber || "",
          containerNo: cont.containerNumber || "",
          ewayBillNo: cont.ewayBillNo || "",
          vehicleNo: cont.vehicleNo || o.vehicleNo || "",
          mode: "CONTAINER",
          isFreeTrial: true,
          remarks: `🎁 3 Months Free Trial: Container E-Way Bill Generated (Cont: ${cont.containerNumber}, EWB: ${cont.ewayBillNo}) - Saved ₹9`,
          performedBy: "System",
          createdAt: cont.ewayBillDate || o.createdAt || new Date(),
          updatedAt: cont.ewayBillDate || o.updatedAt || new Date(),
        });
        totalInserted++;
      }
    }
  } else if (o.ewayBillNo) {
    const existing = await ewayBillCreditHistoryCol.findOne({
      clientId: o.clientId,
      $or: [
        { ewayBillNo: o.ewayBillNo },
        { referenceId: o.boeNumber },
      ],
    });

    if (!existing) {
      await ewayBillCreditHistoryCol.insertOne({
        clientId: o.clientId,
        transactionType: "EWAYBILL_TRIAL_FREE",
        credits: 0,
        moneySaved: 9,
        balanceAfter: 0,
        referenceModel: "OtherEwayBill",
        referenceId: o.boeNumber || "BOE_SYNC",
        boeNo: o.boeNumber || "",
        containerNo: "",
        ewayBillNo: o.ewayBillNo || "",
        vehicleNo: o.vehicleNo || "",
        mode: "FULL",
        isFreeTrial: true,
        remarks: `🎁 3 Months Free Trial: E-Way Bill Generated (BOE: ${o.boeNumber}, EWB: ${o.ewayBillNo}) - Saved ₹9`,
        performedBy: "System",
        createdAt: o.ewayBillDate || o.createdAt || new Date(),
        updatedAt: o.ewayBillDate || o.updatedAt || new Date(),
      });
      totalInserted++;
    }
  }
}

// 2.5 Sync all ewaybills from `ewaybills` collection
const ewaybillsCol = mongoose.connection.db.collection('ewaybills');
const allEwaybills = await ewaybillsCol.find({}).toArray();
console.log(`Found ${allEwaybills.length} ewaybills from 'ewaybills' collection to inspect...`);

for (const e of allEwaybills) {
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

  // Match client ID by clientId, userId, or consignee/importer name
  let targetClientId = e.clientId || e.userId;
  const consignee = e.consigneeName || e.requestPayload?.legal_name_of_consignee;
  if (!targetClientId && consignee) {
    const matchUser = await usersCol.findOne({
      $or: [
        { assignedImporterName: new RegExp(consignee.trim(), "i") },
        { "ie_code_assignments.importer_name": new RegExp(consignee.trim(), "i") },
      ],
    });
    if (matchUser) targetClientId = matchUser._id;
  }

  if (!targetClientId) continue;

  const existing = await ewayBillCreditHistoryCol.findOne({
    $or: [
      ...(ewbNo ? [{ ewayBillNo: ewbNo }] : []),
      { referenceId: refId },
      ...(containerNo && cleanBoe ? [{ boeNo: cleanBoe, containerNo }] : []),
    ],
  });

  if (!existing) {
    const entryDate = e.createdAt || e.generatedAt || new Date();
    await ewayBillCreditHistoryCol.insertOne({
      clientId: targetClientId,
      transactionType: "EWAYBILL_TRIAL_FREE",
      credits: 0,
      moneySaved: 9,
      balanceAfter: 0,
      referenceModel: "EwayBill",
      referenceId: refId,
      boeNo: cleanBoe,
      containerNo,
      ewayBillNo: ewbNo,
      vehicleNo: e.vehicleNo || e.requestPayload?.vehicle_number || "",
      mode: containerNo ? "CONTAINER" : "FULL",
      isFreeTrial: true,
      remarks: `🎁 3 Months Free Trial: ${containerNo ? `Container ${containerNo}` : "E-Way Bill"} Generated (EWB: ${ewbNo || "Verified Active"}) - Saved ₹9`,
      performedBy: "System",
      createdAt: entryDate,
      updatedAt: entryDate,
    });
    totalInserted++;
  }
}

// 3. Sync all active wallets to ensure OFFER_ACTIVATION exists
const allWallets = await walletsCol.find({ walletServiceStatus: "ACTIVE" }).toArray();
for (const w of allWallets) {
  const existingOffer = await ewayBillCreditHistoryCol.findOne({
    clientId: w.clientId,
    transactionType: "OFFER_ACTIVATION",
  });

  if (!existingOffer) {
    const expDateStr = w.validUntil
      ? new Date(w.validUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "90 days";
    await ewayBillCreditHistoryCol.insertOne({
      clientId: w.clientId,
      transactionType: "OFFER_ACTIVATION",
      credits: 0,
      moneySaved: 0,
      balanceAfter: w.availableCredits || 0,
      referenceModel: "AdminAdjustment",
      referenceId: "PROMO-3M-TRIAL",
      boeNo: "",
      containerNo: "",
      ewayBillNo: "",
      vehicleNo: "",
      mode: "ADMIN",
      isFreeTrial: true,
      remarks: `🎁 Introductory Offer Activated: 3 Months Free Trial (Valid for 90 days until ${expDateStr}) - Authorized by superadmin@exim.com`,
      performedBy: "superadmin@exim.com",
      createdAt: w.activationDate || w.createdAt || new Date(),
      updatedAt: w.updatedAt || new Date(),
    });
    totalInserted++;
  }
}

console.log(`✅ Backfill complete! Added ${totalInserted} records to ewaybillcredithistory collection.`);

// Print stats for Umesh Kumar and Bijo Abraham
const testIds = ['6a966a30f3ac303528bc1974', '6aa24c0e24a0b92844925120'];
for (const tid of testIds) {
  const user = await usersCol.findOne({ _id: new mongoose.Types.ObjectId(tid) });
  const count = await ewayBillCreditHistoryCol.countDocuments({
    $or: [{ clientId: new mongoose.Types.ObjectId(tid) }, { clientId: tid }]
  });
  console.log(`User: ${user?.name || tid} -> Total History in ewaybillcredithistory: ${count}`);
}

await mongoose.disconnect();
