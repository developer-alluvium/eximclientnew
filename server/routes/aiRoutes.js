import express from "express";
import { chat } from "../controllers/aiController.js";
import { authenticateUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Protect the chat route - requires authentication
router.post("/chat", authenticateUser, chat);

export default router;
