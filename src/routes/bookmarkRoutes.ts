import { Router } from "express";
import {
  getMyBookmarks,
  toggleBookmark,
} from "../controllers/bookmarkController.js";
import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/my", authenticate, authorizeRoles("student"), getMyBookmarks);
router.post(
  "/toggle/:tuitionId",
  authenticate,
  authorizeRoles("student"),
  toggleBookmark
);

export default router;