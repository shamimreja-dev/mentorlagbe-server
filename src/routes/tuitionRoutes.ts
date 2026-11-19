import { Router } from "express";
import {
  createTuition,
  deleteOwnTuition,
  getAllApprovedTuitions,
  getMyTutorTuitions,
  getTuitionById,
} from "../controllers/tuitionController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";

const router = Router();

// Public routes
router.get("/", getAllApprovedTuitions);

// Tutor routes (placed before /:id so /tutor/my is matched cleanly)
router.get(
  "/tutor/my",
  authenticate,
  authorizeRoles("tutor"),
  getMyTutorTuitions
);
router.post("/", authenticate, authorizeRoles("tutor"), createTuition);
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("tutor"),
  deleteOwnTuition
);

// Public single detail route
router.get("/:id", getTuitionById);

export default router;