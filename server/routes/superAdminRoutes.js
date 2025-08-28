import express from "express";
import {
  superAdminLogin,
  superAdminLogout,
  getSuperAdminProfile,
  protectSuperAdmin,
  createInitialSuperAdmin,
  registerAdmin,
  designateCustomerAsAdmin,
  getAdmins,
  updateAdminStatus,
  getSystemStats,
  getAllCustomers,
  getAllUsers,
  updateCustomerAdminStatus,
  assignModulesToUser,
  bulkAssignModulesToUsers,
  getAvailableIeCodes,
  getAllowedGandhidhamCustomers,
  getCustomerTabVisibility,
  updateCustomerTabVisibility,
    // IE Code assignment functions
  assignIeCodeToUser,
  bulkAssignIeCodeToUsers,
  getAvailableIecCodes
} from "../controllers/superAdminController.js";

import { 
  promoteUserToAdmin,
  demoteUserFromAdmin,
  updateUserStatus,
  // Column permission functions
  getAvailableColumns,
  getUserColumnPermissions,
  updateUserColumnPermissions,
  getCustomerColumnPermissions,
  updateCustomerColumnPermissions,
  bulkUpdateUserColumnPermissions,
  bulkUpdateCustomerColumnPermissions,

} from "../controllers/sharedUserActionController.js";

import {   getUsersByIECode } from "../controllers/userManagementController.js";

import { authenticateUser, authorize, checkIECodeAccess } from "../middlewares/authMiddleware.js";

const router = express.Router();




// SuperAdmin authentication routes
router.post("/api/superadmin/login", superAdminLogin);
router.post("/api/superadmin/logout", superAdminLogout);
router.get("/api/superadmin/profile", protectSuperAdmin, getSuperAdminProfile);

router.get("/api/superadmin/:superadminId/gandhidham-allowed-customers", getAllowedGandhidhamCustomers);

// Initial setup route (only works if no superadmin exists)
router.post("/api/superadmin/setup", createInitialSuperAdmin);

//new user management system routes
router.post("/api/superadmin/admins", protectSuperAdmin, registerAdmin);
router.post("/api/superadmin/designate-customer-admin", protectSuperAdmin, designateCustomerAsAdmin);
router.get("/api/superadmin/admins", protectSuperAdmin, getAdmins);
router.put("/api/superadmin/admins/:adminId/status", protectSuperAdmin, updateAdminStatus);
router.get("/api/superadmin/stats", protectSuperAdmin, getSystemStats);

// Admin Management routes
router.get("/api/superadmin/customers", protectSuperAdmin, getAllCustomers);
router.get("/api/superadmin/all-users", protectSuperAdmin, getAllUsers);
router.get("/api/superadmin/available-ie-codes", protectSuperAdmin, getAvailableIeCodes);
router.put("/api/superadmin/customers/:customerId/admin-status", protectSuperAdmin, updateCustomerAdminStatus);
router.put("/api/superadmin/users/:userId/promote-admin", protectSuperAdmin, promoteUserToAdmin);
router.put("/api/superadmin/users/:userId/demote-admin", protectSuperAdmin, demoteUserFromAdmin);
router.put("/api/superadmin/users/:userId/status", protectSuperAdmin, updateUserStatus);
router.put("/api/superadmin/users/:userId/modules", protectSuperAdmin, assignModulesToUser);
router.post("/api/superadmin/users/bulk-assign-modules", protectSuperAdmin, bulkAssignModulesToUsers);

// IE Code Management Routes (NEW)
router.get("/api/superadmin/available-iec-codes", protectSuperAdmin, getAvailableIecCodes);
router.post("/api/superadmin/users/:userId/assign-ie-code", protectSuperAdmin, assignIeCodeToUser);
router.get("/api/superadmin/users/ie-code/:ieCodeNo", protectSuperAdmin, getUsersByIECode);
router.post("/api/superadmin/users/bulk-assign-ie-code", protectSuperAdmin, bulkAssignIeCodeToUsers);

// Column permissions routes (SuperAdmin only)
router.get("/api/superadmin/available-columns", protectSuperAdmin, getAvailableColumns);

// User column permissions
router.get("/api/superadmin/users/:userId/column-permissions", protectSuperAdmin, getUserColumnPermissions);
router.put("/api/superadmin/users/:userId/column-permissions", protectSuperAdmin, updateUserColumnPermissions);
router.post("/api/superadmin/users/bulk-column-permissions", protectSuperAdmin, bulkUpdateUserColumnPermissions);

// Customer column permissions (backward compatibility)
router.get("/api/superadmin/customers/:customerId/column-permissions", protectSuperAdmin, getCustomerColumnPermissions);
router.put("/api/superadmin/customers/:customerId/column-permissions", protectSuperAdmin, updateCustomerColumnPermissions);
router.post("/api/superadmin/customers/bulk-column-permissions", protectSuperAdmin, bulkUpdateCustomerColumnPermissions);

// Get tab visibility for a customer
router.get("/api/superadmin/customer/:customerId/tab-visibility", getCustomerTabVisibility);
// Update tab visibility for a customer
router.patch("/api/superadmin/customer/:customerId/tab-visibility", updateCustomerTabVisibility);

export default router;
