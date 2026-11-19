import { Router } from "express";
import {
  deleteTuitionByAdmin,
  deleteUserByAdmin,
  getAdminStats,
  getAllTransactions,
  getAllTuitionsForAdmin,
  getAllUsers,
  moderateTuitionStatus,
  updateUserRoleOrPlan,
} from "../controllers/adminController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";

const router = Router();

// All routes below require authenticated 'admin' role
router.use(authenticate, authorizeRoles("admin"));

router.get("/stats", getAdminStats);

router.get("/users", getAllUsers);
router.patch("/users/:id", updateUserRoleOrPlan);
router.delete("/users/:id", deleteUserByAdmin);

router.get("/tuitions", getAllTuitionsForAdmin);
router.patch("/tuitions/:id/status", moderateTuitionStatus);
router.delete("/tuitions/:id", deleteTuitionByAdmin);

router.get("/transactions", getAllTransactions);

export default router;