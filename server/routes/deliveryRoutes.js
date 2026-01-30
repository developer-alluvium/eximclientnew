import express from "express";
import {
  getAllDeliveryAddresses,
  getDeliveryAddressesByIECode,
  searchDeliveryAddresses,
  getDeliveryAddressesByPostalCode,
  fetchAddressFromPostalCode,
  createDeliveryAddress,
  updateJobContainerDeliveryAddress,
} from "../controllers/DeliveryAddressController.js";
import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Get all delivery addresses
router.get("/api/getall", authenticateUser, getAllDeliveryAddresses);

// Get delivery addresses by IE code (for address suggestions)
router.get("/api/ie-code/:ieCode", authenticateUser, getDeliveryAddressesByIECode);

// Search delivery addresses
router.get("/api/search/:query", authenticateUser, searchDeliveryAddresses);

// Get delivery addresses by postal code
router.get("/api/postal-code/:postalCode", authenticateUser, getDeliveryAddressesByPostalCode);

// Fetch address from OpenStreetMap based on postal code
router.get("/api/lookup/:postalCode", authenticateUser, fetchAddressFromPostalCode);

// Create new delivery address
router.post("/api/delivery-address", authenticateUser, createDeliveryAddress);

// Update job container to use delivery address
router.patch(
  "/api/job/:jobId/container/:containerId/address/:addressId",
  authenticateUser,
  updateJobContainerDeliveryAddress
);

export default router;
