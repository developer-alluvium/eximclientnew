import express from 'express';
import { 
  assignIeCodeToUser, 
  removeIeCodeFromUser, 
  listUserIeCodes,
  getAvailableIeCodes
} from '../controllers/ieCodeController.js';
import { bulkAssignIeCodeToUsers } from '../controllers/bulkIeCodeController.js';
import { authenticate, authorize, checkIECodeAccess } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Routes for managing IE code assignments
router.get(
  '/available-ie-codes',
  authorize('superadmin', 'admin'),
  getAvailableIeCodes
);

router.post(
  '/users/:userId/ie-codes',
  authorize('superadmin', 'admin'),
  assignIeCodeToUser
);

router.delete(
  '/users/:userId/ie-codes/:ieCodeNo',
  authorize('superadmin', 'admin'),
  checkIECodeAccess,
  removeIeCodeFromUser
);

router.get(
  '/users/:userId/ie-codes',
  authorize('superadmin', 'admin'),
  listUserIeCodes
);

router.post(
  '/users/bulk-assign',
  authorize('superadmin', 'admin'),
  bulkAssignIeCodeToUsers
);

export default router;
