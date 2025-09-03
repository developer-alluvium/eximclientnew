import express from 'express';
import {
  getUsersByIECode,
  getAvailableImporters,
  getUserStatsByImporter,
  inviteUser,
  updateUserRole,
  updateUserStatus,
  updateColumnPermissions,
  postColumnOrder,
  getColumnOrder
} from '../controllers/userManagementController.js';

import { protectSuperAdmin } from '../controllers/superAdminController.js';

import { 
  promoteUserToAdmin,
  demoteUserFromAdmin,
  getAvailableColumns,
  getUserColumnPermissions,
  updateUserColumnPermissions,
  getCustomerColumnPermissions,
  updateCustomerColumnPermissions,
  bulkUpdateUserColumnPermissions,
  bulkUpdateCustomerColumnPermissions,
  getCustomerTabVisibility,
  updateCustomerTabVisibility
} from "../controllers/sharedUserActionController.js";

import { authenticateUser, authorize, checkIECodeAccess } from "../middlewares/authMiddleware.js";

const router = express.Router();

// SuperAdmin routes
router.get("/superadmin/user/:userId/tab-visibility", protectSuperAdmin, getCustomerTabVisibility);
router.patch("/superadmin/user/:userId/tab-visibility", protectSuperAdmin, updateCustomerTabVisibility);

router.use(authenticateUser);

// User management routes with multiple IE code and importer filtering support
router.get('/users', getUsersByIECode); // ?ie_code_nos=IE001,IE002&importer=ABC%20Imports&page=1&limit=50

// Importer management routes
router.get('/importers', getAvailableImporters); // ?ie_code_nos=IE001,IE002
router.get('/users/stats', getUserStatsByImporter); // ?ie_code_nos=IE001,IE002

// Create/Invite new user (supports multiple IE code assignments)
router.post('/users/invite', 
  authorize('superadmin', 'admin'),
  inviteUser);

// Update user role (supports users with multiple IE codes)
router.patch('/users/:userId/role', authorize('admin', 'superadmin'), updateUserRole);
router.patch('/manage/:userId/promote', authorize('admin', 'superadmin'), promoteUserToAdmin);
router.patch('/manage/:userId/demote', authorize('admin', 'superadmin'), demoteUserFromAdmin);

// Update user status (supports users with multiple IE codes)
router.patch('/users/:userId/status', authorize('admin', 'superadmin'), updateUserStatus);

// Column permissions routes (supports multiple IE codes)
router.get('/available-columns', authorize('admin', 'superadmin'), getAvailableColumns);
router.get('/users/:userId/column-permissions', authorize('admin', 'superadmin'), getUserColumnPermissions);
router.put('/users/:userId/column-permissions', authorize('admin', 'superadmin'), updateUserColumnPermissions);
router.post('/users/bulk-column-permissions', authorize('admin', 'superadmin'), bulkUpdateUserColumnPermissions);

// Legacy column permissions route
router.patch('/users/:userId/columns', authorize('admin', 'superadmin'), updateColumnPermissions);
router.post('/users/columns/order', authorize(), postColumnOrder);
router.get('/users/columns/order', authorize(), getColumnOrder);

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
