import express from 'express';
import {
  getUsersByIECode,
  inviteUser,
  updateUserRole,
  updateColumnPermissions,
  postColumnOrder,
  getColumnOrder
} from '../controllers/userManagementController.js';

import {
  promoteUserToAdmin,
  demoteUserFromAdmin,
  updateUserStatus,
  // Column permission functions
  getAvailableColumns,
  getUserColumnPermissions,
  updateUserColumnPermissions,
  bulkUpdateUserColumnPermissions
} from '../controllers/sharedUserActionController.js';

import { authenticateUser, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes are protected and require authentication
router.use(authenticateUser);


// Get users by IE Code
router.get('/users', getUsersByIECode);

// Create/Invite new user
router.post('/users/invite', inviteUser);

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

export default router;
