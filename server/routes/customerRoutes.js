import express from "express";
import {
  forgotPassword,
  postColumnOrder,
  getColumnOrder,
} from "../controllers/customerController.js";
import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Customer authentication routes (open to customers)
router.post("/api/forgot-password", forgotPassword);

router.post("/api/column-order", authenticateUser, postColumnOrder);
router.get("/api/column-order", authenticateUser, getColumnOrder);

export default router;
