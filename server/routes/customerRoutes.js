import express from "express";
import {
  login,
  registerCustomer,
  forgotPassword,
  logout,
  postColumnOrder,
  getColumnOrder,
  getCustomerKycList,
  getRegisteredCustomers,
  getAllCustomersUnified,
  updateCustomerPassword,
  validateSession,
  getInactiveCustomers,
  getAvailableColumns,
  getCustomerColumnPermissions,
  updateCustomerColumnPermissions,
  bulkUpdateColumnPermissions,
  generateSSOToken,
} from "../controllers/customerController.js";
import { protectSuperAdmin } from "../controllers/superAdminController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Customer authentication routes (open to customers)
router.post("/api/login", login);
router.post("/api/forgot-password", forgotPassword);
router.post("/api/logout", logout);
router.get("/api/validate-session",  validateSession);
router.post("/api/column-order", postColumnOrder);
router.get("/api/column-order", getColumnOrder);

// SuperAdmin protected customer management routes
// SSO token generation for E-Lock redirection
router.post("/api/generate-sso-token", generateSSOToken);

// SuperAdmin protected registration routes
router.post("/api/register", protectSuperAdmin, registerCustomer);

// OPTIMIZED: Unified customer API (replaces multiple endpoints)
router.get("/api/customers", protectSuperAdmin, getAllCustomersUnified);

// DEPRECATED: Legacy endpoints for backward compatibility
router.get("/api/customer-kyc-list", protectSuperAdmin, getCustomerKycList);
router.get("/api/registered-customers", protectSuperAdmin, getRegisteredCustomers);
router.get("/api/inactive-customers", protectSuperAdmin, getInactiveCustomers);

router.put("/api/customer/:customerId/password", protectSuperAdmin, updateCustomerPassword);

// Column permissions routes (SuperAdmin only)
router.get("/api/available-columns", protectSuperAdmin, getAvailableColumns);
router.get("/api/customer/:customerId/column-permissions", protectSuperAdmin, getCustomerColumnPermissions);
router.put("/api/customer/:customerId/column-permissions", protectSuperAdmin, updateCustomerColumnPermissions);
router.post("/api/bulk-column-permissions", protectSuperAdmin, bulkUpdateColumnPermissions);

export default router;
