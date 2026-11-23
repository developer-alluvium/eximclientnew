import express from 'express';
import { 
  getClientTransportData, 
  getBoeExtract, 
  getTrackingStatusHistory,
  searchTruckTracking,
  getTruckVahanDetails 
} from '../controllers/transportController.js';
import { authenticateUser } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Protect all routes
router.use(authenticateUser);

// Proxy route for transport data
router.get('/data', getClientTransportData);
router.get('/boe-extract', getBoeExtract);
router.get('/tracking-history', getTrackingStatusHistory);
router.post('/truck-tracking/search', searchTruckTracking);
router.get('/truck-tracking/vahan-details/:vehicleNo', getTruckVahanDetails);

export default router;

