import '../fix-dns.js';
import mongoose from 'mongoose';
import ClientWallet from '../models/ClientWallet.js';
import CreditLedger from '../models/CreditLedger.js';
import EximclientUser from '../models/eximclientUserModel.js';

const dbUri = 'mongodb+srv://react_db_user:m5o1X7QnWdAKeuu5@cluster0.tcmfe6d.mongodb.net/exim';
await mongoose.connect(dbUri);

console.log('--- 1. BACKFILLING INTRODUCTORY OFFER ACTIVATION RECORDS ---');
const activeWallets = await ClientWallet.find({
  $or: [
    { isFirstTimeActivated: true },
    { walletServiceStatus: 'ACTIVE' },
  ],
});

console.log(`Found ${activeWallets.length} active/trial wallets to verify.`);

for (const wallet of activeWallets) {
  const existingActivationLedger = await CreditLedger.findOne({
    clientId: wallet.clientId,
    transactionType: { $in: ['OFFER_ACTIVATION', 'EWAYBILL_TRIAL_FREE', 'ADMIN_ADJUSTMENT'] },
  });

  if (!existingActivationLedger) {
    const expDateStr = wallet.validUntil
      ? new Date(wallet.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : '90 days';
    const activationDate = wallet.firstActivatedAt || wallet.activationDate || wallet.createdAt || new Date();

    const newLedger = await CreditLedger.create({
      clientId: wallet.clientId,
      transactionType: 'OFFER_ACTIVATION',
      credits: 0,
      balanceAfter: wallet.availableCredits || 0,
      referenceModel: 'AdminAdjustment',
      referenceId: 'PROMO-3M-TRIAL',
      remarks: `🎁 Introductory Offer Activated: 3 Months Free Trial (Valid for 90 days until ${expDateStr}) - Service Activated by SuperAdmin`,
      createdAt: activationDate,
      updatedAt: activationDate,
    });
    console.log(`✅ Backfilled OFFER_ACTIVATION ledger for client ${wallet.clientId} (Ledger ID: ${newLedger._id})`);
  } else {
    console.log(`ℹ️ Client ${wallet.clientId} already has at least one ledger record (${existingActivationLedger.transactionType}).`);
  }
}

console.log('\n--- 2. BACKFILLING HISTORICAL E-WAY BILLS FOR NANDESHWARI STEEL LIMITED ---');
const nandeshwariUser = await EximclientUser.findOne({ email: 'expo@nandeshwariimpex.com' });
if (nandeshwariUser) {
  const clientId = nandeshwariUser._id;
  const historicalEwbs = await mongoose.connection.db.collection('ewaybills').find({
    $or: [
      { 'requestPayload.legal_name_of_consignee': /NANDESHWARI/i },
      { 'requestPayload.legal_name_of_consignor': /NANDESHWARI/i },
      { consigneeName: /NANDESHWARI/i },
      { consignorName: /NANDESHWARI/i },
    ],
  }).sort({ createdAt: 1 }).toArray();

  console.log(`Found ${historicalEwbs.length} historical E-Way bills for Nandeshwari.`);

  let insertedCount = 0;
  for (const ewb of historicalEwbs) {
    const ewbNo = String(ewb.ewbNo || ewb.responseData?.ewayBillNo || '');
    const docNo = String(ewb.documentNumber || ewb.docNo || ewb.requestPayload?.document_number || 'N/A');

    const existing = await CreditLedger.findOne({
      clientId,
      $or: [
        { referenceId: docNo },
        { remarks: new RegExp(ewbNo) },
      ],
    });

    if (!existing && ewbNo) {
      const ewbDate = ewb.createdAt || ewb.generatedAt || new Date(ewb.ewbDate) || new Date();
      await CreditLedger.create({
        clientId,
        transactionType: 'EWAYBILL_TRIAL_FREE',
        credits: 0,
        balanceAfter: 0,
        referenceModel: 'EwayBill',
        referenceId: docNo,
        remarks: `E-Way Bill Generated (${ewbNo}, Vehicle: ${ewb.vehicleNumber || 'Standard'}) - BOE: ${docNo} (Historical Record)`,
        createdAt: ewbDate,
        updatedAt: ewbDate,
      });
      insertedCount++;
    }
  }
  console.log(`✅ Backfilled ${insertedCount} historical E-Way bill ledger entries for Nandeshwari.`);
}

console.log('\n--- 3. VERIFYING LEDGERS FOR NANDESHWARI ---');
if (nandeshwariUser) {
  const userLedgers = await CreditLedger.find({ clientId: nandeshwariUser._id }).sort({ createdAt: -1 }).lean();
  console.log(`Total creditledgers for Nandeshwari now: ${userLedgers.length}`);
  console.log(JSON.stringify(userLedgers.slice(0, 5).map(l => ({
    type: l.transactionType,
    credits: l.credits,
    ref: l.referenceId,
    remarks: l.remarks,
    date: l.createdAt,
  })), null, 2));
}

await mongoose.disconnect();
console.log('Done!');
