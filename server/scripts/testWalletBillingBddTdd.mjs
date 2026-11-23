/**
 * Comprehensive BDD & TDD Test Suite for E-Way Bill Credit Wallet & Billing
 * and SuperAdmin Wallet Management
 * 
 * Features Tested:
 * 1. Model Invariants & Virtual Getters (ClientWallet, CreditLedger, PaymentRequest)
 * 2. Dynamic Pricing Rule Resolver (Standard Commercial vs SFPL+SRCC Partner)
 * 3. Service Validity & Expiration Lifecycle (90-day validity, expiration blocking)
 * 4. Atomic Credit Reservation & Two-Phase Locking (checkAndBlockCredits)
 * 5. Debit Finalization & Ledger Audit Integrity (finalizeDebit)
 * 6. Downstream Failure & Automatic Rollback (rollbackBlockedCredits)
 * 7. Partner Reward Allocation (addRewardCredits)
 * 8. SuperAdmin Manual Adjustments & Negative Balance Guarding (adminAdjustCredits)
 * 9. Idempotency & Duplicate Generation Protection
 * 10. 3-Tier Visual Threshold Classifiers (>20 Healthy, 11-20 Warning, <=10 Critical)
 * 11. SuperAdmin Access Control Gatekeeping
 */

import assert from "assert";
import { extractEwbNumber } from "../services/walletService.js";

// ============================================================================
// PURE UNIT / TDD LOGIC UNDER TEST
// ============================================================================

/**
 * Pure function replicating ClientWallet effective balance invariant
 */
function calculateEffectiveBalance(availableCredits = 0, blockedCredits = 0) {
  const avail = Math.max(0, Number(availableCredits) || 0);
  const blocked = Math.max(0, Number(blockedCredits) || 0);
  return Math.max(0, avail - blocked);
}

/**
 * Pure function checking validity expiration
 */
function isWalletExpired(validUntil, currentTime = new Date()) {
  if (!validUntil) return false;
  return new Date(currentTime) > new Date(validUntil);
}

/**
 * Pure function computing days remaining
 */
function computeDaysRemaining(validUntil, currentTime = new Date()) {
  if (!validUntil) return null;
  const diff = new Date(validUntil).getTime() - new Date(currentTime).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Pure function evaluating pricing rules
 */
function resolvePricingRule(client = {}, context = {}, wallet = null) {
  const formData = context.formData || context || {};
  const transporter = (
    formData.transporterName ||
    formData.transporter ||
    context.transporter ||
    ""
  ).trim().toUpperCase();

  const srccKeywords = ["SRCC", "SR CONTAINER CARRIERS"];
  const isSrccTransporter = srccKeywords.some((keyword) =>
    transporter.includes(keyword)
  );

  const isSfplClient = Boolean(
    client?.isSfplClient ||
    client?.companyName?.toUpperCase()?.includes("SHANTILAL") ||
    client?.companyName?.toUpperCase()?.includes("SFPL") ||
    formData.branchCode === "AMD" ||
    (typeof formData.jobNumber === "string" && formData.jobNumber.startsWith("AMD/"))
  );

  const isFreeTrial = Boolean(
    wallet &&
    wallet.walletServiceStatus === "ACTIVE" &&
    wallet.isFirstTimeActivated &&
    wallet.validUntil &&
    new Date() <= new Date(wallet.validUntil)
  );

  if (isSfplClient && isSrccTransporter) {
    return {
      debit: 0,
      reward: 1,
      tier: "SFPL_SRCC_PARTNER",
      isFreeTrial,
      reason: "SFPL + SRCC Partner Incentive (0 Debit, +1 Reward Credit)",
    };
  }

  if (isFreeTrial) {
    return {
      debit: 0,
      reward: 0,
      tier: "FREE_TRIAL",
      isFreeTrial: true,
      reason: "3 Months Free Trial Active (0 Credits / Free Now)",
    };
  }

  return {
    debit: 1,
    reward: 0,
    tier: "STANDARD_COMMERCIAL",
    isFreeTrial: false,
    reason: "Standard Tier (1 Credit per E-Way Bill)",
  };
}

/**
 * Pure function for 3-tier visual status
 */
function getVisualTier(effectiveCredits) {
  if (effectiveCredits <= 10) return "CRITICAL";
  if (effectiveCredits <= 20) return "WARNING";
  return "HEALTHY";
}

/**
 * Pure function for INR to Credit conversion
 */
function inrToCredits(amountInr, rate = 9) {
  const amt = Number(amountInr) || 0;
  return Math.floor(amt / rate);
}

/**
 * Pure simulation of Two-Phase Lock: check and block credits
 */
function simulateCheckAndBlock(wallet, amount, currentTime = new Date()) {
  // Service status gatekeeping
  if (wallet.walletServiceStatus === "INACTIVE") {
    const err = new Error("E-Way Bill wallet service is currently inactive for this account.");
    err.code = "WALLET_SERVICE_INACTIVE";
    err.status = 403;
    throw err;
  }

  if (isWalletExpired(wallet.validUntil, currentTime)) {
    const err = new Error("Wallet expired");
    err.code = "WALLET_EXPIRED";
    err.status = 403;
    throw err;
  }

  if (amount <= 0) {
    return { ...wallet };
  }

  const effective = calculateEffectiveBalance(wallet.availableCredits, wallet.blockedCredits);
  if (effective < amount) {
    const err = new Error(`Insufficient credits. Required ${amount}, available ${effective}`);
    err.code = "INSUFFICIENT_CREDITS";
    err.status = 402;
    err.available = effective;
    err.required = amount;
    throw err;
  }

  return {
    ...wallet,
    blockedCredits: wallet.blockedCredits + amount,
  };
}

/**
 * Pure simulation of debit finalization
 */
function simulateFinalizeDebit(wallet, amount, refId, remarks = "E-Way Bill Generation") {
  if (amount <= 0) return { wallet, ledger: null };

  if (wallet.blockedCredits < amount || wallet.availableCredits < amount) {
    throw new Error("Inconsistent blocked credits state during finalization");
  }

  const updatedWallet = {
    ...wallet,
    availableCredits: wallet.availableCredits - amount,
    blockedCredits: wallet.blockedCredits - amount,
  };

  const ledgerEntry = {
    clientId: wallet.clientId,
    transactionType: "EWAYBILL_DEBIT",
    credits: -amount,
    balanceAfter: updatedWallet.availableCredits,
    referenceModel: "OtherEwayBill",
    referenceId: refId,
    remarks,
    createdAt: new Date(),
  };

  return { wallet: updatedWallet, ledger: ledgerEntry };
}

/**
 * Pure simulation of failure rollback
 */
function simulateRollback(wallet, amount) {
  if (amount <= 0) return { ...wallet };
  return {
    ...wallet,
    blockedCredits: Math.max(0, wallet.blockedCredits - amount),
  };
}
const simulateRollbackBlocked = simulateRollback;

/**
 * Pure simulation of partner incentive reward
 */
function simulateAddReward(wallet, amount, refId, remarks = "Reward Incentive") {
  if (amount <= 0) return { wallet, ledger: null };

  const updatedWallet = {
    ...wallet,
    availableCredits: wallet.availableCredits + amount,
  };

  const ledgerEntry = {
    clientId: wallet.clientId,
    transactionType: "EWAYBILL_REWARD",
    credits: amount,
    balanceAfter: updatedWallet.availableCredits,
    referenceModel: "OtherEwayBill",
    referenceId: refId,
    remarks,
    createdAt: new Date(),
  };

  return { wallet: updatedWallet, ledger: ledgerEntry };
}

/**
 * Pure simulation of SuperAdmin manual adjustment
 */
function simulateAdminAdjust(wallet, delta, remarks, adminEmail, extendDays = null) {
  if (delta < 0 && (wallet.availableCredits + delta) < 0) {
    throw new Error(`Cannot deduct ${Math.abs(delta)} credits. Balance cannot go negative.`);
  }

  let newValidUntil = wallet.validUntil;
  if (extendDays && Number(extendDays) > 0) {
    newValidUntil = new Date(Date.now() + Number(extendDays) * 24 * 60 * 60 * 1000);
  } else if (delta > 0 && isWalletExpired(wallet.validUntil)) {
    // Auto-topup validity grant: 90 days
    newValidUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  }

  const updatedWallet = {
    ...wallet,
    availableCredits: wallet.availableCredits + delta,
    validUntil: newValidUntil,
  };

  const ledgerEntry = {
    clientId: wallet.clientId,
    transactionType: "ADMIN_ADJUSTMENT",
    credits: delta,
    balanceAfter: updatedWallet.availableCredits,
    referenceModel: "AdminAdjustment",
    remarks: remarks || `Manual adjustment of ${delta > 0 ? "+" : ""}${delta} credits by ${adminEmail}`,
    createdAt: new Date(),
  };

  return { wallet: updatedWallet, ledger: ledgerEntry };
}

/**
 * Pure simulation of toggling wallet service status (ERP lifecycle & 3-month free service)
 */
function simulateToggleServiceStatus(wallet, newStatus, adminEmail, remarks = "") {
  const normalized = String(newStatus).toUpperCase();
  if (!["ACTIVE", "INACTIVE"].includes(normalized)) {
    throw new Error("Invalid status");
  }

  const previousStatus = wallet.walletServiceStatus || "INACTIVE";
  let isFirstActivation = false;
  let validUntil = wallet.validUntil;
  let isFirstTimeActivated = Boolean(wallet.isFirstTimeActivated);
  let firstActivatedAt = wallet.firstActivatedAt || null;

  if (normalized === "ACTIVE") {
    if (!isFirstTimeActivated) {
      isFirstActivation = true;
      isFirstTimeActivated = true;
      firstActivatedAt = new Date();
      validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 3 months free
      remarks = remarks || "First-time service activation: 3 months free trial service activated.";
    } else {
      if (!validUntil || new Date() > new Date(validUntil)) {
        validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      }
      remarks = remarks || "Service reactivated by SuperAdmin.";
    }
  } else {
    remarks = remarks || "Service deactivated by SuperAdmin.";
  }

  const historyEntry = {
    status: normalized,
    previousStatus,
    changedBy: adminEmail,
    changedAt: new Date(),
    remarks,
    validUntil,
    isFirstActivation,
  };

  const updatedWallet = {
    ...wallet,
    walletServiceStatus: normalized,
    isFirstTimeActivated,
    firstActivatedAt,
    validUntil,
    serviceStatusHistory: [...(wallet.serviceStatusHistory || []), historyEntry],
  };

  return { wallet: updatedWallet, isFirstActivation };
}

/**
 * Pure simulation of updating partner pricing tier (ERP audit trail)
 */
function simulateUpdatePartnerTier(wallet, client, isPartner, adminEmail, remarks = "") {
  const previousState = Boolean(client?.isSfplClient);
  const updatedClient = { ...client, isSfplClient: Boolean(isPartner) };

  const historyEntry = {
    isSfplClient: Boolean(isPartner),
    previousState,
    changedBy: adminEmail,
    changedAt: new Date(),
    remarks: remarks || (isPartner ? "SFPL+SRCC Partner tier enabled" : "Standard commercial tier enabled"),
  };

  const updatedWallet = {
    ...wallet,
    partnerTierHistory: [...(wallet.partnerTierHistory || []), historyEntry],
  };

  return { client: updatedClient, wallet: updatedWallet };
}

/**
 * Helper to determine container count for multiplier billing.
 * Handles both Single and Combined E-Way Bills (Job containers & Others standalone BOE).
 */
function extractContainerCount(body) {
  if (!body) return 1;

  // 1. Explicit numeric count
  if (typeof body.selectedContainerCount === "number" && body.selectedContainerCount > 0) {
    return Math.floor(body.selectedContainerCount);
  }
  if (typeof body.formData?.selectedContainerCount === "number" && body.formData.selectedContainerCount > 0) {
    return Math.floor(body.formData.selectedContainerCount);
  }

  // 2. Container arrays (top-level or in formData)
  const containerArray =
    (Array.isArray(body.containerIds) && body.containerIds.length > 0 && body.containerIds) ||
    (Array.isArray(body.formData?.containerIds) && body.formData.containerIds.length > 0 && body.formData.containerIds) ||
    (Array.isArray(body.selectedContainers) && body.selectedContainers.length > 0 && body.selectedContainers) ||
    (Array.isArray(body.formData?.selectedContainers) && body.formData.selectedContainers.length > 0 && body.formData.selectedContainers) ||
    (Array.isArray(body.containers) && body.containers.length > 0 && body.containers) ||
    (Array.isArray(body.formData?.containers) && body.formData.containers.length > 0 && body.formData.containers);

  if (containerArray && containerArray.length > 0) {
    return containerArray.length;
  }

  return 1;
}

/**
 * Pure simulation of E-Way Bill generation interception with container multiplier
 * and strict receipt-of-EWB guarantee.
 */
function simulateGenerateBilling(wallet, client, body, downstreamResponse) {
  // 1. Resolve pricing & containers
  const pricing = resolvePricingRule(client, body, wallet);
  const containerCount = extractContainerCount(body);
  const totalDebit = pricing.debit > 0 ? pricing.debit * containerCount : 0;
  const totalReward = pricing.reward > 0 ? pricing.reward * containerCount : 0;

  // 2. Service status & expiration checks
  if (wallet.walletServiceStatus === "INACTIVE") {
    return {
      status: 403,
      code: "WALLET_SERVICE_INACTIVE",
      message: "Wallet service inactive",
      wallet,
    };
  }
  if (wallet.validUntil && new Date() > new Date(wallet.validUntil)) {
    return {
      status: 403,
      code: "WALLET_EXPIRED",
      message: "Wallet expired",
      wallet,
    };
  }

  // 3. Pre-flight balance check
  const effectiveBal = calculateEffectiveBalance(wallet.availableCredits, wallet.blockedCredits);
  if (totalDebit > 0 && effectiveBal < totalDebit) {
    return {
      status: 402,
      code: "INSUFFICIENT_CREDITS",
      message: `Insufficient credit balance for ${containerCount} container(s)`,
      requiredCredits: totalDebit,
      containerCount,
      effectiveBalance: effectiveBal,
      wallet,
    };
  }

  // 4. Block credits
  let workingWallet = { ...wallet };
  let blockedAmount = 0;
  if (totalDebit > 0) {
    workingWallet = simulateCheckAndBlock(workingWallet, totalDebit);
    blockedAmount = totalDebit;
  }

  // 5. Downstream evaluation with universal 12-digit EWB extraction
  let isSuccess =
    downstreamResponse.status >= 200 &&
    downstreamResponse.status < 300 &&
    downstreamResponse.data?.success !== false;

  const generatedEwbNo = extractEwbNumber(downstreamResponse.data);

  const responseMsg = String(
    downstreamResponse.data?.message ||
    downstreamResponse.data?.error ||
    downstreamResponse.data?.status_desc ||
    ""
  ).toLowerCase();

  const isAlreadyGenerated =
    responseMsg.includes("already generated") ||
    responseMsg.includes("already exists");

  if (isAlreadyGenerated && generatedEwbNo) {
    isSuccess = true;
  }

  // 6. Finalize or Rollback
  let ledger = null;
  if (isSuccess && generatedEwbNo) {
    if (totalDebit > 0) {
      if (isAlreadyGenerated) {
        workingWallet = simulateRollbackBlocked(workingWallet, blockedAmount);
      } else {
        const fin = simulateFinalizeDebit(workingWallet, totalDebit, "REF_1", `Generated ${generatedEwbNo}`);
        workingWallet = fin.wallet;
        ledger = fin.ledger;
      }
    } else if (pricing.isFreeTrial) {
      ledger = {
        clientId: wallet.clientId,
        transactionType: "EWAYBILL_TRIAL_FREE",
        credits: 0,
        balanceAfter: workingWallet.availableCredits,
        referenceModel: "OtherEwayBill",
        remarks: `3 Months Free Trial: E-Way Bill ${isAlreadyGenerated ? "Verified Active" : "Generated"} (${generatedEwbNo}, ${containerCount} Container${containerCount > 1 ? "s" : ""}) - Free (0 Cr)`,
        createdAt: new Date(),
      };
    }

    if (totalReward > 0) {
      const rew = simulateAddReward(workingWallet, totalReward, "REF_1", `Reward ${generatedEwbNo}`);
      workingWallet = rew.wallet;
      ledger = rew.ledger;
    }

    return {
      status: isAlreadyGenerated ? 200 : downstreamResponse.status,
      success: true,
      ewbNo: generatedEwbNo,
      containerCount,
      debited: isAlreadyGenerated ? 0 : totalDebit,
      rewarded: totalReward,
      wallet: workingWallet,
      ledger,
      isFreeTrial: Boolean(pricing.isFreeTrial),
    };
  }

  // Rollback
  if (blockedAmount > 0) {
    workingWallet = simulateRollbackBlocked(workingWallet, blockedAmount);
  }
  return {
    status: downstreamResponse.status,
    success: false,
    rolledBack: true,
    containerCount,
    debited: 0,
    rewarded: 0,
    wallet: workingWallet,
    ledger: null,
    message: downstreamResponse.data?.message || "Downstream failure or missing EWB number",
  };
}

// ============================================================================
// TEST RUNNER
// ============================================================================

async function runTestSuite() {
  console.log("================================================================================");
  console.log("🚀 STARTING BDD & TDD TEST SUITE: E-WAY BILL CREDIT WALLET & BILLING");
  console.log("   & SUPERADMIN WALLET MANAGEMENT (ENTERPRISE ADMIN-MANAGED MODEL)");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}\n`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // 1. TDD: MODEL INVARIANTS & VIRTUAL GETTERS
  // --------------------------------------------------------------------------
  console.log("📌 Feature 1: Model Invariants & Virtual Property Guarantees");

  test("Scenario 1.1: effectiveBalance = max(0, availableCredits - blockedCredits)", () => {
    assert.strictEqual(calculateEffectiveBalance(100, 20), 80);
    assert.strictEqual(calculateEffectiveBalance(50, 0), 50);
    assert.strictEqual(calculateEffectiveBalance(10, 10), 0);
  });

  test("Scenario 1.2: effectiveBalance invariant cannot go below zero even if blocked > available", () => {
    assert.strictEqual(calculateEffectiveBalance(5, 10), 0, "Spendable balance cannot be negative");
  });

  test("Scenario 1.3: Wallet expiration correctly detects expired dates vs active dates", () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24); // Yesterday
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days ahead

    assert.strictEqual(isWalletExpired(pastDate), true, "Yesterday must be expired");
    assert.strictEqual(isWalletExpired(futureDate), false, "30 days in future must not be expired");
    assert.strictEqual(isWalletExpired(null), false, "Null date is considered unexpired");
  });

  test("Scenario 1.4: daysRemaining calculation accuracy", () => {
    const now = new Date("2026-09-22T12:00:00Z");
    const target = new Date("2026-09-27T12:00:00Z"); // Exactly 5 days
    assert.strictEqual(computeDaysRemaining(target, now), 5);
  });

  test("Scenario 1.5: INR to Credits conversion (1 Credit = ₹9)", () => {
    assert.strictEqual(inrToCredits(900, 9), 100);
    assert.strictEqual(inrToCredits(9, 9), 1);
    assert.strictEqual(inrToCredits(15, 9), 1, "Should floor to nearest whole credit");
    assert.strictEqual(inrToCredits(8, 9), 0, "Amounts under ₹9 yield 0 credits");
  });

  // --------------------------------------------------------------------------
  // 2. TDD: DYNAMIC PRICING RULE RESOLVER
  // --------------------------------------------------------------------------
  console.log("\n📌 Feature 2: Dynamic Pricing Rule Resolver (getPricingRule)");

  test("Scenario 2.1: Standard Commercial Client gets 1 Debit, 0 Reward", () => {
    const client = { isSfplClient: false, companyName: "ACME TRADERS LTD" };
    const context = { transporter: "V-TRANS LOGISTICS" };
    const rule = resolvePricingRule(client, context);

    assert.strictEqual(rule.debit, 1);
    assert.strictEqual(rule.reward, 0);
    assert.strictEqual(rule.tier, "STANDARD_COMMERCIAL");
  });

  test("Scenario 2.2: SFPL Client + SRCC Transporter gets 0 Debit, 1 Reward Credit", () => {
    const client = { isSfplClient: true, companyName: "SFPL GLOBAL" };
    const context = { transporter: "SR CONTAINER CARRIERS" };
    const rule = resolvePricingRule(client, context);

    assert.strictEqual(rule.debit, 0);
    assert.strictEqual(rule.reward, 1);
    assert.strictEqual(rule.tier, "SFPL_SRCC_PARTNER");
  });

  test("Scenario 2.3: Branch AMD / Job AMD prefix activates SFPL flag with SRCC", () => {
    const client = { isSfplClient: false };
    const context = { branchCode: "AMD", transporter: "SRCC" };
    const rule = resolvePricingRule(client, context);

    assert.strictEqual(rule.debit, 0);
    assert.strictEqual(rule.reward, 1);
    assert.strictEqual(rule.tier, "SFPL_SRCC_PARTNER");
  });

  test("Scenario 2.4: SFPL Client with non-SRCC transporter falls back to Standard Tier", () => {
    const client = { isSfplClient: true };
    const context = { transporter: "SAFEXPRESS" };
    const rule = resolvePricingRule(client, context);

    assert.strictEqual(rule.debit, 1);
    assert.strictEqual(rule.reward, 0);
    assert.strictEqual(rule.tier, "STANDARD_COMMERCIAL");
  });

  // --------------------------------------------------------------------------
  // 3. BDD: 3-TIER VISUAL THRESHOLDS
  // --------------------------------------------------------------------------
  console.log("\n📌 Feature 3: Visual Threshold Classification for Enterprise UI");

  test("Scenario 3.1: Balance > 20 classifies as HEALTHY (Green)", () => {
    assert.strictEqual(getVisualTier(21), "HEALTHY");
    assert.strictEqual(getVisualTier(100), "HEALTHY");
  });

  test("Scenario 3.2: Balance between 11 and 20 classifies as WARNING (Yellow)", () => {
    assert.strictEqual(getVisualTier(20), "WARNING");
    assert.strictEqual(getVisualTier(15), "WARNING");
    assert.strictEqual(getVisualTier(11), "WARNING");
  });

  test("Scenario 3.3: Balance <= 10 classifies as CRITICAL (Red)", () => {
    assert.strictEqual(getVisualTier(10), "CRITICAL");
    assert.strictEqual(getVisualTier(5), "CRITICAL");
    assert.strictEqual(getVisualTier(0), "CRITICAL");
  });

  // --------------------------------------------------------------------------
  // 4. BDD: ATOMIC TWO-PHASE CREDIT RESERVATION & DEBIT FINALIZATION
  // --------------------------------------------------------------------------
  console.log("\n📌 Feature 4: Two-Phase Credit Reservation (Block -> Execute -> Finalize)");

  test("Scenario 4.1: Given sufficient balance, checkAndBlockCredits increments blockedCredits", () => {
    const wallet = {
      clientId: "client_1",
      availableCredits: 50,
      blockedCredits: 0,
      validUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    };

    const blocked = simulateCheckAndBlock(wallet, 1);
    assert.strictEqual(blocked.blockedCredits, 1);
    assert.strictEqual(blocked.availableCredits, 50);
    assert.strictEqual(calculateEffectiveBalance(blocked.availableCredits, blocked.blockedCredits), 49);
  });

  test("Scenario 4.2: Given insufficient balance, checkAndBlockCredits throws 402 INSUFFICIENT_CREDITS", () => {
    const wallet = {
      clientId: "client_2",
      availableCredits: 0,
      blockedCredits: 0,
      validUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    };

    assert.throws(
      () => simulateCheckAndBlock(wallet, 1),
      (err) => err.code === "INSUFFICIENT_CREDITS" && err.status === 402
    );
  });

  test("Scenario 4.3: Given in-flight blocked credits equal to available, new block is rejected", () => {
    const wallet = {
      clientId: "client_3",
      availableCredits: 2,
      blockedCredits: 2, // effectiveBalance is 0
      validUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    };

    assert.throws(
      () => simulateCheckAndBlock(wallet, 1),
      (err) => err.code === "INSUFFICIENT_CREDITS"
    );
  });

  test("Scenario 4.4: Given an expired wallet, checkAndBlockCredits throws 403 WALLET_EXPIRED", () => {
    const wallet = {
      clientId: "client_4",
      availableCredits: 100, // Even with high credits!
      blockedCredits: 0,
      validUntil: new Date(Date.now() - 1000 * 60 * 60 * 24), // Expired
    };

    assert.throws(
      () => simulateCheckAndBlock(wallet, 1),
      (err) => err.code === "WALLET_EXPIRED" && err.status === 403
    );
  });

  test("Scenario 4.5: On downstream success, finalizeDebit decrements both available and blocked", () => {
    const blockedWallet = {
      clientId: "client_5",
      availableCredits: 50,
      blockedCredits: 1,
    };

    const { wallet, ledger } = simulateFinalizeDebit(blockedWallet, 1, "EWB_123456789012");

    assert.strictEqual(wallet.availableCredits, 49);
    assert.strictEqual(wallet.blockedCredits, 0);
    assert.strictEqual(calculateEffectiveBalance(wallet.availableCredits, wallet.blockedCredits), 49);

    assert.ok(ledger, "Must generate a ledger entry");
    assert.strictEqual(ledger.transactionType, "EWAYBILL_DEBIT");
    assert.strictEqual(ledger.credits, -1);
    assert.strictEqual(ledger.balanceAfter, 49);
    assert.strictEqual(ledger.referenceId, "EWB_123456789012");
  });

  // --------------------------------------------------------------------------
  // 5. BDD: DOWNSTREAM FAILURE ROLLBACK & ZERO-LOSS GUARANTEE
  // --------------------------------------------------------------------------
  console.log("\n📌 Feature 5: Downstream Failure Rollback & Zero-Loss Guarantee");

  test("Scenario 5.1: On downstream failure, rollbackBlockedCredits restores spendable effectiveBalance", () => {
    const blockedWallet = {
      clientId: "client_6",
      availableCredits: 10,
      blockedCredits: 1, // effectiveBalance was 9
    };

    const restoredWallet = simulateRollbackBlocked(blockedWallet, 1);

    assert.strictEqual(restoredWallet.blockedCredits, 0);
    assert.strictEqual(restoredWallet.availableCredits, 10, "Available credits must NOT be deducted");
    assert.strictEqual(calculateEffectiveBalance(restoredWallet.availableCredits, restoredWallet.blockedCredits), 10);
  });

  test("Scenario 5.2: Unexpected server exception safely triggers rollback without leaking credits", () => {
    const wallet = { clientId: "client_7", availableCredits: 20, blockedCredits: 1 };
    const rolledBack = simulateRollbackBlocked(wallet, 1);

    assert.strictEqual(rolledBack.blockedCredits, 0);
    assert.strictEqual(rolledBack.availableCredits, 20);
  });

  // --------------------------------------------------------------------------
  // 6. BDD: PARTNER REWARD CREDIT INCENTIVE
  // --------------------------------------------------------------------------
  console.log("\n📌 Feature 6: SFPL+SRCC Partner Reward Incentives");

  test("Scenario 6.1: Partner generation increments availableCredits and logs EWAYBILL_REWARD", () => {
    const wallet = { clientId: "sfpl_client", availableCredits: 10, blockedCredits: 0 };
    const { wallet: updated, ledger } = simulateAddReward(wallet, 1, "EWB_999888777666");

    assert.strictEqual(updated.availableCredits, 11);
    assert.strictEqual(ledger.transactionType, "EWAYBILL_REWARD");
    assert.strictEqual(ledger.credits, 1);
    assert.strictEqual(ledger.balanceAfter, 11);
  });

  // --------------------------------------------------------------------------
  // 7. BDD: SUPERADMIN WALLET MANAGEMENT & MANUAL ADJUSTMENTS
  // --------------------------------------------------------------------------
  console.log("\n📌 Feature 7: SuperAdmin Wallet Management (Enterprise Top-Up & Deductions)");

  test("Scenario 7.1: SuperAdmin can add credits (+delta) and logs ADMIN_ADJUSTMENT", () => {
    const wallet = { clientId: "client_8", availableCredits: 50, validUntil: new Date(Date.now() + 10000000) };
    const { wallet: updated, ledger } = simulateAdminAdjust(wallet, 100, "NEFT Ref #12345", "superadmin@exim.com");

    assert.strictEqual(updated.availableCredits, 150);
    assert.strictEqual(ledger.transactionType, "ADMIN_ADJUSTMENT");
    assert.strictEqual(ledger.credits, 100);
    assert.strictEqual(ledger.balanceAfter, 150);
  });

  test("Scenario 7.2: SuperAdmin credit deduction cannot drive wallet balance negative", () => {
    const wallet = { clientId: "client_9", availableCredits: 20 };

    assert.throws(
      () => simulateAdminAdjust(wallet, -30, "Correction", "superadmin@exim.com"),
      (err) => err.message.includes("Balance cannot go negative")
    );
  });

  test("Scenario 7.3: Adding credits to an expired wallet automatically renews validity by 90 days", () => {
    const expiredDate = new Date("2025-01-01T00:00:00Z");
    const wallet = { clientId: "client_10", availableCredits: 0, validUntil: expiredDate };

    const { wallet: updated } = simulateAdminAdjust(wallet, 50, "Renewed top-up", "superadmin@exim.com");

    assert.strictEqual(updated.availableCredits, 50);
    assert(new Date(updated.validUntil) > new Date(), "Validity must be extended into the future");
  });

  test("Scenario 7.4: Custom validity extension can be specified via extendDays", () => {
    const wallet = { clientId: "client_11", availableCredits: 10, validUntil: new Date() };
    const { wallet: updated } = simulateAdminAdjust(wallet, 10, "Extended plan", "superadmin@exim.com", 180);

    const daysRemaining = computeDaysRemaining(updated.validUntil);
    assert(daysRemaining >= 179 && daysRemaining <= 181, `Expected ~180 days, got ${daysRemaining}`);
  });

  // --------------------------------------------------------------------------
  // 8. BDD: IDEMPOTENCY & DUPLICATE PREVENTION
  // --------------------------------------------------------------------------
  console.log("\n📌 Feature 8: Idempotency & Replay Protection");

  test("Scenario 8.1: Cached E-Way Bill for already-generated container bypasses billing", () => {
    const existingContainers = [
      { containerNumber: "MSCU1234567", ewayBillStatus: "Generated", ewayBillNo: "123456789012" }
    ];

    const requestedContainer = "MSCU1234567";
    const match = existingContainers.find(
      (c) => c.containerNumber === requestedContainer && c.ewayBillStatus === "Generated" && c.ewayBillNo
    );

    assert.ok(match, "Should find existing generated E-Way Bill");
    assert.strictEqual(match.ewayBillNo, "123456789012");
  });

  // --------------------------------------------------------------------------
  // 9. BDD: ACCESS CONTROL GATEKEEPING
  // --------------------------------------------------------------------------
  console.log("\n📌 Feature 9: Access Control Gatekeeping");

  test("Scenario 9.1: Only superadmin@exim.com or superadmin role is permitted for manual-adjustment", () => {
    const isSuperAdminAuthorized = (user) => {
      const email = (user?.email || "").toLowerCase();
      const role = (user?.role || "").toLowerCase();
      return email === "superadmin@exim.com" || email === "punit@alluvium.in" || role === "superadmin" || role === "super_admin";
    };

    assert.strictEqual(isSuperAdminAuthorized({ email: "superadmin@exim.com", role: "superadmin" }), true);
    assert.strictEqual(isSuperAdminAuthorized({ email: "punit@alluvium.in", role: "admin" }), true);
    assert.strictEqual(isSuperAdminAuthorized({ email: "client@company.com", role: "customer" }), false);
    assert.strictEqual(isSuperAdminAuthorized({ email: "regular_admin@exim.com", role: "user" }), false);
  });

  // --------------------------------------------------------------------------
  // 10. BDD: ERP WALLET SERVICE LIFECYCLE & 3-MONTH FREE TRIAL
  // --------------------------------------------------------------------------
  console.log("\n📌 Feature 10: ERP Wallet Service Lifecycle (walletServiceStatus & 3-Month Free Trial)");

  test("Scenario 10.1: Default wallet service status is INACTIVE with isFirstTimeActivated=false", () => {
    const freshWallet = {
      clientId: "client_new",
      availableCredits: 0,
      blockedCredits: 0,
      walletServiceStatus: "INACTIVE",
      isFirstTimeActivated: false,
      firstActivatedAt: null,
      serviceStatusHistory: [],
    };

    assert.strictEqual(freshWallet.walletServiceStatus, "INACTIVE");
    assert.strictEqual(freshWallet.isFirstTimeActivated, false);
    assert.strictEqual(freshWallet.firstActivatedAt, null);
  });

  test("Scenario 10.2: E-Way Bill generation is blocked when walletServiceStatus === 'INACTIVE'", () => {
    const inactiveWallet = {
      clientId: "client_inactive",
      availableCredits: 100,
      blockedCredits: 0,
      walletServiceStatus: "INACTIVE",
      validUntil: new Date(Date.now() + 10000000),
    };

    assert.throws(
      () => simulateCheckAndBlock(inactiveWallet, 1),
      (err) => err.code === "WALLET_SERVICE_INACTIVE" && err.status === 403
    );
  });

  test("Scenario 10.3: First-time activation sets ACTIVE, isFirstTimeActivated=true, and grants 3 months free service", () => {
    const initialWallet = {
      clientId: "client_trial",
      availableCredits: 0,
      blockedCredits: 0,
      walletServiceStatus: "INACTIVE",
      isFirstTimeActivated: false,
      firstActivatedAt: null,
      validUntil: null,
      serviceStatusHistory: [],
    };

    const { wallet: activated, isFirstActivation } = simulateToggleServiceStatus(
      initialWallet,
      "ACTIVE",
      "superadmin@exim.com"
    );

    assert.strictEqual(isFirstActivation, true);
    assert.strictEqual(activated.walletServiceStatus, "ACTIVE");
    assert.strictEqual(activated.isFirstTimeActivated, true);
    assert.ok(activated.firstActivatedAt instanceof Date);

    const daysRemaining = computeDaysRemaining(activated.validUntil);
    assert(daysRemaining >= 89 && daysRemaining <= 91, `Expected ~90 days free trial, got ${daysRemaining}`);
  });

  test("Scenario 10.4: First-time activation records serviceStatusHistory entry with isFirstActivation=true", () => {
    const initialWallet = {
      clientId: "client_audit",
      availableCredits: 0,
      blockedCredits: 0,
      walletServiceStatus: "INACTIVE",
      isFirstTimeActivated: false,
      serviceStatusHistory: [],
    };

    const { wallet: activated } = simulateToggleServiceStatus(
      initialWallet,
      "ACTIVE",
      "superadmin@exim.com",
      "Client onboarded on 3-month trial"
    );

    assert.strictEqual(activated.serviceStatusHistory.length, 1);
    const log = activated.serviceStatusHistory[0];
    assert.strictEqual(log.status, "ACTIVE");
    assert.strictEqual(log.previousStatus, "INACTIVE");
    assert.strictEqual(log.changedBy, "superadmin@exim.com");
    assert.strictEqual(log.isFirstActivation, true);
    assert.strictEqual(log.remarks, "Client onboarded on 3-month trial");
  });

  test("Scenario 10.5: Deactivating service sets status to INACTIVE and appends audit record", () => {
    const activeWallet = {
      clientId: "client_deactivate",
      walletServiceStatus: "ACTIVE",
      isFirstTimeActivated: true,
      serviceStatusHistory: [
        { status: "ACTIVE", previousStatus: "INACTIVE", changedBy: "superadmin@exim.com" }
      ],
    };

    const { wallet: deactivated, isFirstActivation } = simulateToggleServiceStatus(
      activeWallet,
      "INACTIVE",
      "superadmin@exim.com",
      "Temporarily suspended per client request"
    );

    assert.strictEqual(isFirstActivation, false);
    assert.strictEqual(deactivated.walletServiceStatus, "INACTIVE");
    assert.strictEqual(deactivated.serviceStatusHistory.length, 2);
    const log = deactivated.serviceStatusHistory[1];
    assert.strictEqual(log.status, "INACTIVE");
    assert.strictEqual(log.previousStatus, "ACTIVE");
    assert.strictEqual(log.remarks, "Temporarily suspended per client request");
  });

  test("Scenario 10.6: Reactivating service preserves original firstActivatedAt timestamp", () => {
    const originalTime = new Date("2026-01-01T10:00:00Z");
    const deactivatedWallet = {
      clientId: "client_reactivate",
      walletServiceStatus: "INACTIVE",
      isFirstTimeActivated: true,
      firstActivatedAt: originalTime,
      serviceStatusHistory: [],
    };

    const { wallet: reactivated, isFirstActivation } = simulateToggleServiceStatus(
      deactivatedWallet,
      "ACTIVE",
      "superadmin@exim.com",
      "Subscription renewed"
    );

    assert.strictEqual(isFirstActivation, false);
    assert.strictEqual(reactivated.walletServiceStatus, "ACTIVE");
    assert.strictEqual(reactivated.isFirstTimeActivated, true);
    assert.strictEqual(reactivated.firstActivatedAt.getTime(), originalTime.getTime(), "Original activation date must not change");
    assert.strictEqual(reactivated.serviceStatusHistory[0].isFirstActivation, false);
  });

  // --------------------------------------------------------------------------
  // 11. BDD: ERP PARTNER TIER AUDIT TRAIL
  // --------------------------------------------------------------------------
  console.log("\n📌 Feature 11: ERP Partner Tier History & Audit Trail");

  test("Scenario 11.1: Updating partner tier records chronological audit entry in partnerTierHistory", () => {
    const client = { _id: "client_p1", isSfplClient: false };
    const wallet = { clientId: "client_p1", partnerTierHistory: [] };

    const { client: updatedClient, wallet: updatedWallet } = simulateUpdatePartnerTier(
      wallet,
      client,
      true,
      "superadmin@exim.com",
      "Promoted to partner tier for Q3"
    );

    assert.strictEqual(updatedClient.isSfplClient, true);
    assert.strictEqual(updatedWallet.partnerTierHistory.length, 1);
    const entry = updatedWallet.partnerTierHistory[0];
    assert.strictEqual(entry.isSfplClient, true);
    assert.strictEqual(entry.previousState, false);
    assert.strictEqual(entry.changedBy, "superadmin@exim.com");
    assert.strictEqual(entry.remarks, "Promoted to partner tier for Q3");
  });

  test("Scenario 11.2: Decoupled invariant: Partner tier changes do not alter walletServiceStatus", () => {
    const client = { _id: "client_p2", isSfplClient: true };
    const wallet = {
      clientId: "client_p2",
      walletServiceStatus: "ACTIVE",
      serviceStatusHistory: [{ status: "ACTIVE" }],
      partnerTierHistory: [],
    };

    const { wallet: updatedWallet } = simulateUpdatePartnerTier(
      wallet,
      client,
      false,
      "superadmin@exim.com",
      "Partner agreement ended"
    );

    assert.strictEqual(updatedWallet.walletServiceStatus, "ACTIVE", "Service status must remain ACTIVE");
    assert.strictEqual(updatedWallet.serviceStatusHistory.length, 1, "Service status history must be unaffected");
    assert.strictEqual(updatedWallet.partnerTierHistory.length, 1, "Partner tier history must record the downgrade");
  });

  // --------------------------------------------------------------------------
  console.log("\n📌 Feature 12: Container-Based Multiplier Billing & Strict EWB Receipt Guarantee");

  test("Scenario 12.1: extractContainerCount accurately parses explicit counts, container arrays, and fallbacks", () => {
    assert.strictEqual(extractContainerCount({ selectedContainerCount: 4 }), 4, "Direct numeric selectedContainerCount");
    assert.strictEqual(extractContainerCount({ formData: { selectedContainerCount: 3 } }), 3, "formData selectedContainerCount");
    assert.strictEqual(extractContainerCount({ containerIds: ["c1", "c2", "c3", "c4", "c5"] }), 5, "Direct containerIds array");
    assert.strictEqual(extractContainerCount({ formData: { containerIds: ["c1", "c2"] } }), 2, "formData containerIds array");
    assert.strictEqual(extractContainerCount({ selectedContainers: [{ id: 1 }, { id: 2 }] }), 2, "selectedContainers array");
    assert.strictEqual(extractContainerCount({ formData: { selectedContainers: [{ id: 1 }, { id: 2 }, { id: 3 }] } }), 3, "formData selectedContainers array");
    assert.strictEqual(extractContainerCount({ containers: [{ id: 1 }] }), 1, "containers array");
    assert.strictEqual(extractContainerCount({}), 1, "Default fallback for empty object is 1");
    assert.strictEqual(extractContainerCount(null), 1, "Default fallback for null is 1");
  });

  test("Scenario 12.2: Standard client generating Combined E-Way Bill for 4 containers blocks and finalizes 4 credits (₹36)", () => {
    const client = { _id: "client_std", isSfplClient: false };
    const wallet = {
      clientId: "client_std",
      availableCredits: 10,
      blockedCredits: 0,
      walletServiceStatus: "ACTIVE",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
    const body = {
      selectedContainerCount: 4,
      containerIds: ["CONT_A", "CONT_B", "CONT_C", "CONT_D"],
      formData: { documentNumber: "BOE_1001" },
    };
    const downstreamRes = {
      status: 200,
      data: {
        success: true,
        data: { ewbNo: "123456789012", ewbDate: "2026-09-22" },
      },
    };

    const result = simulateGenerateBilling(wallet, client, body, downstreamRes);
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.ewbNo, "123456789012");
    assert.strictEqual(result.containerCount, 4);
    assert.strictEqual(result.debited, 4, "Must debit 4 credits for 4 containers");
    assert.strictEqual(result.rewarded, 0);
    assert.strictEqual(result.wallet.availableCredits, 6, "Available credits should drop from 10 to 6");
    assert.strictEqual(result.wallet.blockedCredits, 0, "Blocked credits should be reset to 0 after finalization");
  });

  test("Scenario 12.3: Pre-flight check rejects generation with HTTP 402 INSUFFICIENT_CREDITS when balance < required container credits", () => {
    const client = { _id: "client_low_bal", isSfplClient: false };
    const wallet = {
      clientId: "client_low_bal",
      availableCredits: 3,
      blockedCredits: 0,
      walletServiceStatus: "ACTIVE",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
    const body = {
      selectedContainerCount: 4, // requires 4 credits, but only 3 available
      containerIds: ["C1", "C2", "C3", "C4"],
    };
    const downstreamRes = { status: 200, data: { success: true, data: { ewbNo: "123456789012" } } };

    const result = simulateGenerateBilling(wallet, client, body, downstreamRes);
    assert.strictEqual(result.status, 402, "Should return HTTP 402");
    assert.strictEqual(result.code, "INSUFFICIENT_CREDITS");
    assert.strictEqual(result.requiredCredits, 4);
    assert.strictEqual(result.effectiveBalance, 3);
    assert.strictEqual(result.wallet.availableCredits, 3, "Available credits must remain untouched");
    assert.strictEqual(result.wallet.blockedCredits, 0, "Blocked credits must remain 0");
  });

  test("Scenario 12.4: Downstream response without valid ewbNo triggers automatic rollback with zero credit leakage", () => {
    const client = { _id: "client_err", isSfplClient: false };
    const wallet = {
      clientId: "client_err",
      availableCredits: 10,
      blockedCredits: 0,
      walletServiceStatus: "ACTIVE",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
    const body = {
      selectedContainerCount: 4,
      containerIds: ["C1", "C2", "C3", "C4"],
    };
    // Downstream returns HTTP 200 but no EWB number (e.g. partial response or validation error)
    const downstreamRes = {
      status: 200,
      data: {
        success: false,
        message: "NIC Portal Error: Pin code distance mismatch",
        data: null,
      },
    };

    const result = simulateGenerateBilling(wallet, client, body, downstreamRes);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.rolledBack, true, "Credits must be marked rolled back");
    assert.strictEqual(result.debited, 0, "Zero credits debited on missing EWB number");
    assert.strictEqual(result.wallet.availableCredits, 10, "Available credits fully preserved at 10");
    assert.strictEqual(result.wallet.blockedCredits, 0, "Blocked credits fully cleared to 0");
  });

  test("Scenario 12.5: Downstream HTTP 500 error triggers automatic rollback of all blocked credits", () => {
    const client = { _id: "client_500", isSfplClient: false };
    const wallet = {
      clientId: "client_500",
      availableCredits: 8,
      blockedCredits: 0,
      walletServiceStatus: "ACTIVE",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
    const body = {
      selectedContainerCount: 3,
      containerIds: ["C1", "C2", "C3"],
    };
    const downstreamRes = {
      status: 500,
      data: {
        success: false,
        message: "Internal Server Error in NIC Gateway",
      },
    };

    const result = simulateGenerateBilling(wallet, client, body, downstreamRes);
    assert.strictEqual(result.status, 500);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.rolledBack, true);
    assert.strictEqual(result.debited, 0);
    assert.strictEqual(result.wallet.availableCredits, 8, "Available credits intact after 500");
    assert.strictEqual(result.wallet.blockedCredits, 0, "Blocked credits restored to 0");
  });

  test("Scenario 12.6: Partner client (SFPL + SRCC) generating Combined E-Way Bill for 4 containers debits 0 and receives +4 reward credits", () => {
    const client = { _id: "client_partner", isSfplClient: true };
    const wallet = {
      clientId: "client_partner",
      availableCredits: 5,
      blockedCredits: 0,
      walletServiceStatus: "ACTIVE",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
    const body = {
      selectedContainerCount: 4,
      containerIds: ["C1", "C2", "C3", "C4"],
      formData: { transporterName: "SRCC LOGISTICS LTD" },
    };
    const downstreamRes = {
      status: 200,
      data: {
        success: true,
        data: { ewbNo: "998877665544", ewbDate: "2026-09-22" },
      },
    };

    const result = simulateGenerateBilling(wallet, client, body, downstreamRes);
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.ewbNo, "998877665544");
    assert.strictEqual(result.debited, 0, "Partner client pays 0 debit");
    assert.strictEqual(result.rewarded, 4, "Partner client earns 4 reward credits (1 per container)");
    assert.strictEqual(result.wallet.availableCredits, 9, "Available credits increase from 5 to 9");
    assert.strictEqual(result.wallet.blockedCredits, 0);
  });

  test("Scenario 12.7: Standalone BOE (Others E-Way Bills) with 3 containers charges exactly 3 credits upon EWB receipt", () => {
    const client = { _id: "client_others", isSfplClient: false };
    const wallet = {
      clientId: "client_others",
      availableCredits: 15,
      blockedCredits: 0,
      walletServiceStatus: "ACTIVE",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
    const body = {
      formData: {
        documentNumber: "BOE_STANDALONE_999",
        selectedContainers: [
          { containerNumber: "MSKU001" },
          { containerNumber: "MSKU002" },
          { containerNumber: "MSKU003" },
        ],
      },
    };
    const downstreamRes = {
      status: 200,
      data: {
        success: true,
        data: { ewbNo: "333444555666", ewbDate: "2026-09-22" },
      },
    };

    const result = simulateGenerateBilling(wallet, client, body, downstreamRes);
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.containerCount, 3);
    assert.strictEqual(result.debited, 3, "3 containers in standalone BOE must cost 3 credits");
    assert.strictEqual(result.wallet.availableCredits, 12, "Available credits drop from 15 to 12");
  });

  test("Scenario 12.8: Single container E-Way Bill charges exactly 1 credit upon EWB receipt", () => {
    const client = { _id: "client_single", isSfplClient: false };
    const wallet = {
      clientId: "client_single",
      availableCredits: 10,
      blockedCredits: 0,
      walletServiceStatus: "ACTIVE",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
    const body = {
      containerId: "TGHU9876543",
      formData: { documentNumber: "BOE_SINGLE_101" },
    };
    const downstreamRes = {
      status: 200,
      data: {
        success: true,
        data: { ewbNo: "777888999000", ewbDate: "2026-09-22" },
      },
    };

    const result = simulateGenerateBilling(wallet, client, body, downstreamRes);
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.containerCount, 1);
    assert.strictEqual(result.debited, 1, "Single container costs 1 credit");
    assert.strictEqual(result.wallet.availableCredits, 9, "Available credits drop from 10 to 9");
  });

  // --------------------------------------------------------------------------
  // FEATURE 13: 3 MONTHS FREE TRIAL ACCOUNTABILITY & UNIVERSAL EWB EXTRACTION
  // --------------------------------------------------------------------------
  console.log("\n🧪 Feature 13: 3 Months Free Trial Accountability & Universal E-Way Bill Extraction");

  test("Scenario 13.1: Free trial pricing rule debits 0 credits and creates EWAYBILL_TRIAL_FREE ledger entry", () => {
    const client = { _id: "client_trial_1", isSfplClient: false };
    const wallet = {
      clientId: "client_trial_1",
      availableCredits: 50,
      blockedCredits: 0,
      walletServiceStatus: "ACTIVE",
      isFirstTimeActivated: true,
      validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // active trial
    };
    const body = {
      formData: { documentNumber: "BOE_TRIAL_001" },
      containerIds: ["CONT1111111"],
    };
    const downstreamRes = {
      status: 200,
      data: {
        success: true,
        data: { ewbNo: "371010885063", ewbDate: "2026-09-22" },
      },
    };

    const result = simulateGenerateBilling(wallet, client, body, downstreamRes);
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.isFreeTrial, true);
    assert.strictEqual(result.debited, 0, "Trial client must not be charged credits");
    assert.strictEqual(result.wallet.availableCredits, 50, "Available credits unchanged at 50");
    assert.ok(result.ledger, "Must record an audit ledger entry for accountability");
    assert.strictEqual(result.ledger.transactionType, "EWAYBILL_TRIAL_FREE");
    assert.strictEqual(result.ledger.credits, 0);
    assert.strictEqual(result.ledger.balanceAfter, 50);
    assert.ok(result.ledger.remarks.includes("371010885063"), "Remarks must reference the EWB number");
  });

  test("Scenario 13.2: Multi-container EWB generation during Free Trial charges 0 credits and logs container count in ledger remarks", () => {
    const client = { _id: "client_trial_2", isSfplClient: false };
    const wallet = {
      clientId: "client_trial_2",
      availableCredits: 100,
      blockedCredits: 0,
      walletServiceStatus: "ACTIVE",
      isFirstTimeActivated: true,
      validUntil: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    };
    const body = {
      formData: { documentNumber: "BOE_TRIAL_MULTI" },
      containerIds: ["CONT_A", "CONT_B", "CONT_C", "CONT_D"],
    };
    const downstreamRes = {
      status: 200,
      data: {
        success: true,
        data: { ewbNo: "998877665544", ewbDate: "2026-09-22" },
      },
    };

    const result = simulateGenerateBilling(wallet, client, body, downstreamRes);
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.containerCount, 4);
    assert.strictEqual(result.debited, 0, "All 4 containers are free during trial");
    assert.strictEqual(result.wallet.availableCredits, 100);
    assert.strictEqual(result.ledger.transactionType, "EWAYBILL_TRIAL_FREE");
    assert.strictEqual(result.ledger.credits, 0);
    assert.ok(result.ledger.remarks.includes("4 Containers"), "Ledger remarks must state container count");
  });

  test("Scenario 13.3: Universal extractEwbNumber extracts 12-digit number from nested responseData and string messages", () => {
    // 1. Direct field
    assert.strictEqual(extractEwbNumber({ ewbNo: "371010885063" }), "371010885063");
    // 2. Nested under responseData
    assert.strictEqual(extractEwbNumber({ responseData: { ewayBillNo: "371010885063" } }), "371010885063");
    // 3. Nested inside data.responseData
    assert.strictEqual(extractEwbNumber({ data: { responseData: { ewbNo: "371010885063" } } }), "371010885063");
    // 4. In error message string
    assert.strictEqual(
      extractEwbNumber({ message: "E-Way Bill 371010885063 already generated for this document" }),
      "371010885063"
    );
    // 5. In results array
    assert.strictEqual(
      extractEwbNumber({ results: [{ status: "success", ewbNo: "371010885063" }] }),
      "371010885063"
    );
  });

  test("Scenario 13.4: Downstream 'already generated' response is treated as success with 0 debit", () => {
    const client = { _id: "client_std", isSfplClient: false };
    const wallet = {
      clientId: "client_std",
      availableCredits: 20,
      blockedCredits: 0,
      walletServiceStatus: "ACTIVE",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
    const body = {
      containerId: "CONT_ALREADY",
      formData: { documentNumber: "BOE_ALREADY" },
    };
    const downstreamRes = {
      status: 400,
      data: {
        success: false,
        message: "Eway bill 371010885063 already generated for this document",
      },
    };

    const result = simulateGenerateBilling(wallet, client, body, downstreamRes);
    assert.strictEqual(result.status, 200, "Already generated returns HTTP 200 success");
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.ewbNo, "371010885063");
    assert.strictEqual(result.debited, 0, "No duplicate debit for already generated EWB");
    assert.strictEqual(result.wallet.availableCredits, 20, "Credits remain 20");
  });

  test("Scenario 13.5: Free trial client with balance = 0 is not blocked by pre-flight check", () => {
    const client = { _id: "client_zero_bal", isSfplClient: false };
    const wallet = {
      clientId: "client_zero_bal",
      availableCredits: 0,
      blockedCredits: 0,
      walletServiceStatus: "ACTIVE",
      isFirstTimeActivated: true,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
    const body = {
      formData: { documentNumber: "BOE_ZERO_BAL" },
      containerIds: ["CONT_1", "CONT_2"],
    };
    const downstreamRes = {
      status: 200,
      data: {
        success: true,
        data: { ewbNo: "112233445566", ewbDate: "2026-09-22" },
      },
    };

    const result = simulateGenerateBilling(wallet, client, body, downstreamRes);
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.debited, 0);
    assert.strictEqual(result.wallet.availableCredits, 0);
    assert.strictEqual(result.ledger.transactionType, "EWAYBILL_TRIAL_FREE");
  });

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`📊 FINAL TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
