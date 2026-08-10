import express from 'express';
import {
  assignAdditionalIeCode,
  removeIeCodeFromUser,
  listUserIeCodes,
  bulkAssignAdditionalIeCodes,
  updateIeCodeFilter
} from '../controllers/superAdminIeCodeController.js';
import {
  assignBranchAccess,
  removeBranchAccess
} from '../controllers/superAdminBranchController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes require authentication and superadmin authorization
router.use(authenticate);
router.use(authorize('superadmin'));

// Single user IE code management
router.post('/users/:userId/ie-codes', assignAdditionalIeCode);
router.put('/users/:userId/ie-codes/filter', updateIeCodeFilter);
router.delete('/users/:userId/ie-codes/remove-ie-codes', removeIeCodeFromUser);
router.get('/users/:userId/ie-codes', listUserIeCodes);
router.post('/users/:userId/branch-access', assignBranchAccess);
router.delete('/users/:userId/branch-access', removeBranchAccess);

// Bulk IE code management
router.post('/users/bulk-assign-ie-codes', bulkAssignAdditionalIeCodes);

export default router;
