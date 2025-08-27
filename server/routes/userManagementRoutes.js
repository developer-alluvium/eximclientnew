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
  // Tab visibility functions
  getCustomerTabVisibility,
  updateCustomerTabVisibility
} from "../controllers/sharedUserActionController.js";

const router = express.Router();

// SuperAdmin authentication routes
router.post("/api/superadmin/login", superAdminLogin);
router.post("/api/superadmin/logout", superAdminLogout);
router.get("/api/superadmin/profile", protectSuperAdmin, getSuperAdminProfile);

router.get("/api/superadmin/:superadminId/gandhidham-allowed-customers", getAllowedGandhidhamCustomers);

// Initial setup route (only works if no superadmin exists)
router.post("/api/superadmin/setup", createInitialSuperAdmin);

// New user management system routes
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

// Tab visibility routes (SuperAdmin only)
router.get("/superadmin/user/:userId/tab-visibility", protectSuperAdmin, getCustomerTabVisibility);
router.patch("/superadmin/user/:userId/tab-visibility", protectSuperAdmin, updateCustomerTabVisibility);

export default router;
