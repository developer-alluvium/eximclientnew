import express from 'express';
import {
  getUsersByIECode,
  inviteUser,
  updateUserRole,
  updateUserStatus,
  updateColumnPermissions
} from '../controllers/userManagementController.js';

import { authenticateUser, authorize } from '../middlewares/authMiddleware.js';
const router = express.Router();

// All routes are protected and require authentication
router.use(authenticateUser);
router.use(authorize('user'));

// Get users by IE Code
router.get('/users', getUsersByIECode);

// Create/Invite new user
router.post('/users/invite', inviteUser);

// Update user role
router.patch('/users/:userId/role', updateUserRole);

// Update user status
router.patch('/users/:userId/status', updateUserStatus);

// Update column permissions
router.patch('/users/:userId/columns', updateColumnPermissions);

export default router;
