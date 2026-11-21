import { Router } from "express";
import {
  getCurrentUser,
  handleGoogleCallbackSync,
  loginUser,
  registerUser,
  updateProfile,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/google/callback", handleGoogleCallbackSync);
router.get("/me", authenticate, getCurrentUser);
router.patch("/profile", authenticate, updateProfile);

export default router;