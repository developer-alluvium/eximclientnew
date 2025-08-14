import express from "express";
import { 
  loginAdmin,
  getAdminDashboard,
  getUsers,
  updateUserStatus,
  manageModuleAccess,
  getUserDetails,
  logoutAdmin
} from "../controllers/adminController.js";
import { authenticateUser, authorize, checkIECodeAccess } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/login", loginAdmin);

// Protected routes (requires admin authentication)
router.use(authenticateUser);
router.use(authorize('admin'));

router.get("/dashboard", getAdminDashboard);
router.get("/users", getUsers);
router.get("/users/:userId", getUserDetails);
router.put("/users/:userId/status", updateUserStatus);
router.put("/users/:userId/modules", manageModuleAccess);
router.post("/logout", logoutAdmin);

export default router;
