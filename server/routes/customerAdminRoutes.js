import express from "express";
import {
  loginCustomerAdmin,
  getCustomerAdminDashboard,
  getCustomerUsers,
  updateUserStatus
} from "../controllers/customerAdminController.js";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/login", loginCustomerAdmin);

// Protected routes (requires customer authentication)
router.use(authenticate); // Using existing customer auth

router.get("/dashboard", getCustomerAdminDashboard);
router.get("/users", getCustomerUsers);
router.put("/users/:userId/status", updateUserStatus);

export default router;
