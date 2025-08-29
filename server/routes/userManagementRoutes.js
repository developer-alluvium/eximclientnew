
import express from 'express';
import {
  getUsersByIECode,
  inviteUser,
  updateUserRole,
  updateColumnPermissions,
  postColumnOrder,
  getColumnOrder
} from '../controllers/userManagementController.js';

import{ 
  protectSuperAdmin
} from '../controllers/superAdminController.js';

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

import { authenticateUser, authorize, checkIECodeAccess } from "../middlewares/authMiddleware.js";

const router = express.Router();


router.get("/superadmin/user/:userId/tab-visibility", protectSuperAdmin, getCustomerTabVisibility);
router.patch("/superadmin/user/:userId/tab-visibility", protectSuperAdmin, updateCustomerTabVisibility);

router.use(authenticateUser);

// User management routes with multiple IE code support
router.get('/users', getUsersByIECode); // Now supports querying users by multiple IE codes

// Create/Invite new user (updated to support multiple IE codes)
router.post('/users/invite', 
  authorize('superadmin', 'admin'),
  async (req, res, next) => {
    // Convert single IE code to array format if needed
    if (req.body.ie_code_no && !Array.isArray(req.body.ie_code_no)) {
      req.body.ie_code_assignments = [{
        ie_code_no: req.body.ie_code_no,
        importer_name: req.body.importer || 'Unknown'
      }];
    }
    next();
  },
  inviteUser);

// Update user role
router.patch('/users/:userId/role', authorize('admin'), updateUserRole);
router.patch('/manage/:userId/promote', authorize('admin'), promoteUserToAdmin);
router.patch('/manage/:userId/demote', authorize('admin'), demoteUserFromAdmin);

// Update user status
router.patch('/users/:userId/status', authorize('admin'), updateUserStatus);

// Column permissions routes (Admin can manage users within their IE Code)
router.get('/available-columns', authorize('admin'), getAvailableColumns);
router.get('/users/:userId/column-permissions', authorize('admin'), getUserColumnPermissions);
router.put('/users/:userId/column-permissions', authorize('admin'), updateUserColumnPermissions);
router.post('/users/bulk-column-permissions', authorize('admin'), bulkUpdateUserColumnPermissions);

// Legacy column permissions route
router.patch('/users/:userId/columns', authorize('admin'), updateColumnPermissions);
router.post('/users/columns/order', authorize(), postColumnOrder);
router.get('/users/columns/order', authorize(), getColumnOrder);


// Tab visibility routes (SuperAdmin only)


export default router;


// import express from 'express';
// import {
//   getUsersByIECode,
//   inviteUser,
//   updateUserRole,
//   updateColumnPermissions,
//   postColumnOrder,
//   getColumnOrder
// } from '../controllers/userManagementController.js';

// import {
//   promoteUserToAdmin,
//   demoteUserFromAdmin,
//   updateUserStatus,
//   // Column permission functions
//   getAvailableColumns,
//   getUserColumnPermissions,
//   updateUserColumnPermissions,
//   bulkUpdateUserColumnPermissions
// } from '../controllers/sharedUserActionController.js';

// import { authenticateUser, authorize } from '../middlewares/authMiddleware.js';

// const router = express.Router();

// // All routes are protected and require authentication
// router.use(authenticateUser);


// // Get users by IE Code
// router.get('/users', getUsersByIECode);

// // Create/Invite new user
// router.post('/users/invite', inviteUser);

// // Update user role
// router.patch('/users/:userId/role', authorize('admin'), updateUserRole);
// router.patch('/manage/:userId/promote', authorize('admin'), promoteUserToAdmin);
// router.patch('/manage/:userId/demote', authorize('admin'), demoteUserFromAdmin);

// // Update user status
// router.patch('/users/:userId/status', authorize('admin'), updateUserStatus);

// // Column permissions routes (Admin can manage users within their IE Code)
// router.get('/available-columns', authorize('admin'), getAvailableColumns);
// router.get('/users/:userId/column-permissions', authorize('admin'), getUserColumnPermissions);
// router.put('/users/:userId/column-permissions', authorize('admin'), updateUserColumnPermissions);
// router.post('/users/bulk-column-permissions', authorize('admin'), bulkUpdateUserColumnPermissions);

// // Legacy column permissions route
// router.patch('/users/:userId/columns', authorize('admin'), updateColumnPermissions);
// router.post('/users/columns/order', authorize(), postColumnOrder);
// router.get('/users/columns/order', authorize(), getColumnOrder);

// export default router;
