import express from "express";
import { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  getUserDashboard, 
  logoutUser,
  requestModuleAccess 
} from "../controllers/userController.js";
import { authenticateUser, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected routes (requires authentication)
router.use(authenticateUser);
router.use(authorize('user', 'admin'));

router.get("/profile", getUserProfile);
router.get("/dashboard", getUserDashboard);
router.post("/logout", logoutUser);
router.post("/request-module-access", requestModuleAccess);

export default router;
