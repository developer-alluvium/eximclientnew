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
  promoteUserToAdmin,
  demoteUserFromAdmin,
  getAvailableIeCodes
} from "../controllers/superAdminController.js";
import { authenticateUser, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

// SuperAdmin authentication routes
router.post("/api/superadmin/login", superAdminLogin);
router.post("/api/superadmin/logout", superAdminLogout);
router.get("/api/superadmin/profile", protectSuperAdmin, getSuperAdminProfile);

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

export default router;
