import { Router } from "express";
import {
  createCheckoutSession,
  verifyCheckoutSession,
} from "../controllers/paymentController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";

const router = Router();

router.post(
  "/create-checkout-session",
  authenticate,
  authorizeRoles("student", "tutor"),
  createCheckoutSession
);

router.post(
  "/verify-session",
  authenticate,
  authorizeRoles("student", "tutor"),
  verifyCheckoutSession
);

export default router;