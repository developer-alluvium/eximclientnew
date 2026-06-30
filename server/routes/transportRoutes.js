import express from 'express';
import { getClientTransportData, getBoeExtract } from '../controllers/transportController.js';
import { authenticateUser } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Protect all routes
router.use(authenticateUser);

// Proxy route for transport data
router.get('/data', getClientTransportData);
router.get('/boe-extract', getBoeExtract);

export default router;
