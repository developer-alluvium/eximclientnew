import express from 'express';
import {
  assignAdditionalIeCode,
  removeIeCodeFromUser,
  listUserIeCodes,
  bulkAssignAdditionalIeCodes
} from '../controllers/superAdminIeCodeController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes require authentication and superadmin authorization
router.use(authenticate);
router.use(authorize('superadmin'));

// Single user IE code management
router.post('/users/:userId/ie-codes', assignAdditionalIeCode);
router.delete('/users/:userId/ie-codes/remove-ie-codes', removeIeCodeFromUser);
router.get('/users/:userId/ie-codes', listUserIeCodes);

// Bulk IE code management
router.post('/users/bulk-assign-ie-codes', bulkAssignAdditionalIeCodes);

export default router;
