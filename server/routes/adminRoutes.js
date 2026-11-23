import express from "express";
import { 
  loginAdmin,
  getAdminDashboard,
  getUsers,
  updateUserStatus,
  manageModuleAccess,
  getUserDetails,
  logoutAdmin
} from "../controllers/adminController.js";
import { authenticateUser, authorize, checkIECodeAccess } from "../middlewares/authMiddleware.js";
import { adminAdjustCredits, getOrCreateWallet } from "../services/walletService.js";
import mongoose from "mongoose";
import EximclientUser from "../models/eximclientUserModel.js";
import CustomerModel from "../models/customerModel.js";
import AdminModel from "../models/adminModel.js";
import ClientWallet from "../models/ClientWallet.js";
import CreditLedger from "../models/CreditLedger.js";

const router = express.Router();

// Public routes
router.post("/login", loginAdmin);

// Protected routes (requires admin authentication)
router.use(authenticateUser);

/**
 * SuperAdmin Wallet Management: Manual Adjustment
 * POST /api/admin/wallet/manual-adjustment
 * Strict SuperAdmin gating: req.user.email === 'superadmin@exim.com'
 */
router.post("/wallet/manual-adjustment", async (req, res) => {
  try {
    const email = (req.user?.email || "").toLowerCase();
    const role = (req.user?.role || "").toLowerCase();
    const isSuperAdmin = email === "superadmin@exim.com" || email === "punit@alluvium.in" || role === "superadmin" || role === "super_admin";

    if (!isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only superadmin@exim.com can perform manual credit adjustments.",
      });
    }

    const { clientId, creditsToAdd, creditsDelta, remarks } = req.body;
    if (!clientId) {
      return res.status(400).json({ success: false, message: "clientId is required" });
    }

    const delta = Number(creditsToAdd ?? creditsDelta);
    if (!delta || isNaN(delta) || delta <= 0) {
      return res.status(400).json({ success: false, message: "A valid positive number of credits is required" });
    }

    const adminEmail = req.user.email || "superadmin@exim.com";
    const customRemarks = remarks?.trim()
      ? `${remarks.trim()} (Authorized by ${adminEmail})`
      : `Admin manual adjustment of +${delta} credits by ${adminEmail}`;

    const result = await adminAdjustCredits(clientId, delta, customRemarks, req.user._id);

    res.status(200).json({
      success: true,
      message: `Successfully added ${delta} credit(s). New balance: ${result.wallet.availableCredits}`,
      data: {
        wallet: {
          availableCredits: result.wallet.availableCredits,
          blockedCredits: result.wallet.blockedCredits,
          effectiveBalance: Math.max(0, result.wallet.availableCredits - result.wallet.blockedCredits),
        },
        ledger: result.ledger,
      },
    });
  } catch (err) {
    console.error("Error adjusting client credits via admin route:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to adjust credits" });
  }
});

/**
 * SuperAdmin Wallet Management: List Clients with Wallets
 * GET /api/admin/wallet/clients
 */
router.get("/wallet/clients", async (req, res) => {
  try {
    const email = (req.user?.email || "").toLowerCase();
    const role = (req.user?.role || "").toLowerCase();
    const isSuperAdmin = email === "superadmin@exim.com" || email === "punit@alluvium.in" || role === "superadmin" || role === "super_admin" || Boolean(req.user?.isAdmin);

    if (!isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Administrator privileges required.",
      });
    }

    const search = req.query.search ? req.query.search.trim() : "";
    const userQuery = {};
    if (search) {
      userQuery.$or = [
        { name: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
        { ie_code_no: new RegExp(search, "i") },
      ];
    }

    const users = await EximclientUser.find(userQuery)
      .select("_id name email role status ie_code_no createdAt")
      .sort({ name: 1 })
      .lean();

    const userIds = users.map((u) => u._id);
    const wallets = await ClientWallet.find({ clientId: { $in: userIds } }).lean();
    const walletMap = new Map();
    wallets.forEach((w) => walletMap.set(w.clientId.toString(), w));

    let totalCirculatingCredits = 0;

    const clientsWithWallets = users.map((u) => {
      const w = walletMap.get(u._id.toString()) || { availableCredits: 0, blockedCredits: 0 };
      totalCirculatingCredits += w.availableCredits || 0;

      return {
        id: u._id.toString(),
        _id: u._id,
        name: u.name || "N/A",
        email: u.email,
        role: u.role || "user",
        status: u.status || (u.isActive ? "active" : "inactive"),
        ie_code_no: u.ie_code_no || "N/A",
        availableCredits: w.availableCredits || 0,
        blockedCredits: w.blockedCredits || 0,
        effectiveBalance: Math.max(0, (w.availableCredits || 0) - (w.blockedCredits || 0)),
        createdAt: u.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        clients: clientsWithWallets,
        summary: {
          totalClients: users.length,
          totalCirculatingCredits,
        },
      },
    });
  } catch (err) {
    console.error("Error fetching admin clients:", err);
    res.status(500).json({ success: false, message: "Failed to fetch clients" });
  }
});

/**
 * GET /api/admin/wallet/client-details/:clientId
 * Returns client details, wallet balance, summary stats, partner status, and recent ledger entries.
 */
router.get("/wallet/client-details/:clientId", async (req, res) => {
  try {
    const email = (req.user?.email || "").toLowerCase();
    const role = (req.user?.role || req.userType || "").toLowerCase();
    const isSuperAdmin = email === "superadmin@exim.com" || email === "punit@alluvium.in" || role === "superadmin" || role === "super_admin" || role === "admin" || Boolean(req.user?.isAdmin);

    if (!isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only authorized administrators can access client details.",
      });
    }

    const { clientId } = req.params;
    let [client, wallet, transactions, statsAgg] = await Promise.all([
      EximclientUser.findById(clientId).select("name email role status isSfplClient ie_code_no").lean(),
      getOrCreateWallet(clientId),
      CreditLedger.find({ clientId }).sort({ createdAt: -1 }).limit(20).lean(),
      CreditLedger.aggregate([
        { $match: { clientId: new mongoose.Types.ObjectId(clientId) } },
        {
          $group: {
            _id: "$transactionType",
            totalCredits: { $sum: "$credits" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    if (!client) {
      client = await CustomerModel.findById(clientId).select("name email role status isSfplClient ie_code_no").lean();
    }
    if (!client) {
      client = await AdminModel.findById(clientId).select("name email role status isSfplClient ie_code_no").lean();
    }

    if (!client) {
      return res.status(404).json({ success: false, message: "Client user not found" });
    }

    const stats = {
      totalDebited: 0,
      totalDeposited: 0,
      totalRewarded: 0,
    };

    statsAgg.forEach((item) => {
      if (item._id === "EWAYBILL_DEBIT") {
        stats.totalDebited += Math.abs(item.totalCredits);
      } else if (item._id === "PAYMENT_CREDIT" || item._id === "ADMIN_ADJUSTMENT") {
        if (item.totalCredits > 0) stats.totalDeposited += item.totalCredits;
      } else if (item._id === "EWAYBILL_REWARD") {
        stats.totalRewarded += item.totalCredits;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        client,
        wallet: {
          availableCredits: wallet.availableCredits,
          blockedCredits: wallet.blockedCredits,
          effectiveBalance: Math.max(0, wallet.availableCredits - wallet.blockedCredits),
          activationDate: wallet.activationDate,
          validUntil: wallet.validUntil,
          isExpired: wallet.validUntil ? new Date() > new Date(wallet.validUntil) : false,
          daysRemaining: wallet.validUntil ? Math.ceil((new Date(wallet.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
          walletServiceStatus: wallet.walletServiceStatus || "INACTIVE",
          isFirstTimeActivated: Boolean(wallet.isFirstTimeActivated),
          firstActivatedAt: wallet.firstActivatedAt || null,
        },
        stats,
        isSfplClient: Boolean(client.isSfplClient),
        recentTransactions: transactions,
        serviceStatusHistory: wallet.serviceStatusHistory || [],
        partnerTierHistory: wallet.partnerTierHistory || [],
      },
    });
  } catch (err) {
    console.error("Error fetching client details in adminRoutes:", err);
    res.status(500).json({ success: false, message: "Failed to fetch client details" });
  }
});

// Admin dashboard & user management routes
router.use(authorize('admin'));

router.get("/dashboard", getAdminDashboard);
router.get("/users", getUsers);
router.get("/users/:userId", getUserDetails);
router.put("/users/:userId/status", updateUserStatus);
router.put("/users/:userId/modules", manageModuleAccess);
router.post("/logout", logoutAdmin);

export default router;
