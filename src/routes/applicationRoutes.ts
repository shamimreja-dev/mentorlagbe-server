import { Router } from "express";
import {
  applyForTuition,
  getMyStudentApplications,
  getTutorIncomingApplications,
  updateApplicationStatus,
} from "../controllers/applicationController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";

const router = Router();

// Student routes
router.post("/", authenticate, authorizeRoles("student"), applyForTuition);
router.get(
  "/student/my",
  authenticate,
  authorizeRoles("student"),
  getMyStudentApplications
);

// Tutor routes
router.get(
  "/tutor/incoming",
  authenticate,
  authorizeRoles("tutor"),
  getTutorIncomingApplications
);
router.patch(
  "/:id/status",
  authenticate,
  authorizeRoles("tutor"),
  updateApplicationStatus
);

export default router;