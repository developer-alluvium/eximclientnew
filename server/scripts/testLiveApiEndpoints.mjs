import "../fix-dns.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = "http://localhost:9003/api";
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "3c7c6bab80b4ca6f1980fe6c99ca20e6265ea2ed27b83fc355ab30bee18030ad";

// Helper tokens
const superAdminToken = jwt.sign(
  { id: "65f000000000000000000001", username: "superadmin", email: "superadmin@exim.com", role: "superadmin" },
  JWT_SECRET,
  { expiresIn: "2h" }
);

const userToken = jwt.sign(
  { id: "65f000000000000000000002", email: "client@test.com", role: "user", userType: "user" },
  JWT_SECRET,
  { expiresIn: "2h" }
);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runLiveTests() {
  console.log("================================================================================");
  console.log("🌐 STARTING LIVE HTTP ENDPOINT BDD & TDD VERIFICATION (localhost:9003)");
  console.log("================================================================================\n");

  try {
    // 1. Health check
    console.log("📌 API Scenario 1: Server Health Check");
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, `GET /api/health returned 200 OK (Status: ${healthRes.status})`);
    assert(healthData.success === true, `Server reports healthy state (success: ${healthData.success})`);

    // 2. Client Details without Token (Expect 401)
    console.log("\n📌 API Scenario 2: Unauthenticated Request Gatekeeping");
    const noAuthRes = await fetch(`${BASE_URL}/eway-bill/admin/wallet/client-details/68b96fccf575948f19c143b2`);
    assert(noAuthRes.status === 401, `Unauthenticated request correctly rejected with 401 Unauthorized (Status: ${noAuthRes.status})`);

    // 3. Client Details with SuperAdmin Token (Expect non-401 authentication)
    console.log("\n📌 API Scenario 3: SuperAdmin Authentication on Client Details");
    const authRes = await fetch(`${BASE_URL}/eway-bill/admin/wallet/client-details/68b96fccf575948f19c143b2`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    const authData = await authRes.json();
    assert(authRes.status !== 401, `SuperAdmin token is authenticated (Status: ${authRes.status} !== 401)`);
    assert(authRes.status === 200 || authRes.status === 404, `Resolved to valid response code (Status: ${authRes.status}, Msg: ${authData.message || 'OK'})`);

    // 4. Admin Clients List
    console.log("\n📌 API Scenario 4: SuperAdmin Clients List Retrieval");
    const clientsRes = await fetch(`${BASE_URL}/eway-bill/admin/wallet/clients`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    const clientsData = await clientsRes.json();
    assert(clientsRes.status === 200, `GET /api/eway-bill/admin/wallet/clients returns 200 OK`);
    assert(clientsData.success === true, `Client wallets list returned successfully (found: ${clientsData.data?.clients?.length ?? 0} clients)`);

    // 5. Normal User Forbidden from Admin Adjustment (Expect 403)
    console.log("\n📌 API Scenario 5: Access Control on Manual Credit Adjustments");
    const userAdjustRes = await fetch(`${BASE_URL}/eway-bill/admin/wallet/manual-adjustment`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId: "68b96fccf575948f19c143b2",
        creditsToAdd: 50,
        remarks: "Unauthorized attempt",
      }),
    });
    assert(userAdjustRes.status === 403, `Normal client correctly blocked with 403 Forbidden (Status: ${userAdjustRes.status})`);

    // 6. SuperAdmin Manual Adjustment Payload Validation
    console.log("\n📌 API Scenario 6: SuperAdmin Manual Adjustment Payload Validation");
    const invalidAdjustRes = await fetch(`${BASE_URL}/eway-bill/admin/wallet/manual-adjustment`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${superAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId: "",
        creditsToAdd: -10,
      }),
    });
    assert(invalidAdjustRes.status === 400, `Invalid credit adjustment rejected with 400 Bad Request (Status: ${invalidAdjustRes.status})`);

    // 7. SuperAdmin Toggle Service Status (ACTIVE / INACTIVE + 3-month free service)
    console.log("\n📌 API Scenario 7: SuperAdmin Toggle Wallet Service Status (Active / Deactive)");
    const serviceStatusRes = await fetch(`${BASE_URL}/eway-bill/admin/wallet/set-service-status`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${superAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId: "68b96fccf575948f19c143b2",
        status: "ACTIVE",
        remarks: "Automated API Test Activation - 3 months free trial verification",
      }),
    });
    const serviceStatusData = await serviceStatusRes.json();
    assert(serviceStatusRes.status === 200, `POST /api/eway-bill/admin/wallet/set-service-status returns 200 OK (Status: ${serviceStatusRes.status})`);
    assert(serviceStatusData.data?.walletServiceStatus === "ACTIVE", `Wallet service status is ACTIVE`);
    assert(Array.isArray(serviceStatusData.data?.serviceStatusHistory), `serviceStatusHistory array is returned in payload`);

    // 8. SuperAdmin Toggle Partner Pricing Tier (SFPL + SRCC)
    console.log("\n📌 API Scenario 8: SuperAdmin Set Partner Pricing Tier (with Audit Trail)");
    const partnerTierRes = await fetch(`${BASE_URL}/eway-bill/admin/wallet/set-partner-tier`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${superAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId: "68b96fccf575948f19c143b2",
        isSfplClient: true,
        remarks: "Automated API Test: Partner Tier Activated",
      }),
    });
    const partnerTierData = await partnerTierRes.json();
    assert(partnerTierRes.status === 200, `POST /api/eway-bill/admin/wallet/set-partner-tier returns 200 OK (Status: ${partnerTierRes.status})`);
    assert(Array.isArray(partnerTierData.data?.partnerTierHistory), `partnerTierHistory audit array is returned in payload`);

    // 9. Verify ERP Audit History in Client Details
    console.log("\n📌 API Scenario 9: Client Details Returns Complete ERP History Arrays");
    const detailsRes = await fetch(`${BASE_URL}/eway-bill/admin/wallet/client-details/68b96fccf575948f19c143b2`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    const detailsData = await detailsRes.json();
    assert(detailsRes.status === 200, `GET client-details returns 200 OK`);
    assert(detailsData.data?.wallet?.walletServiceStatus === "ACTIVE", `Client details confirms walletServiceStatus is ACTIVE`);
    assert(Array.isArray(detailsData.data?.serviceStatusHistory), `serviceStatusHistory is populated in client details`);
    assert(Array.isArray(detailsData.data?.partnerTierHistory), `partnerTierHistory is populated in client details`);

    console.log("\n================================================================================");
    console.log(`📊 LIVE API TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
    console.log("================================================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Fatal error during live API tests:", err);
    process.exit(1);
  }
}

runLiveTests();
