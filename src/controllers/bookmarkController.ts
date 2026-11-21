import { Response } from "express";
import { AuthRequest } from "../types/index.js";
import { User } from "../models/User.js";
import { Tuition } from "../models/Tuition.js";

export const toggleBookmark = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const rawTuitionId = req.params.tuitionId;
    const tuitionId = Array.isArray(rawTuitionId)
      ? rawTuitionId[0]
      : rawTuitionId;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!tuitionId) {
      res.status(400).json({ success: false, message: "Tuition ID is required." });
      return;
    }

    if (req.user?.role && req.user.role !== "student") {
      res.status(403).json({
        success: false,
        message: "Only students can bookmark tuitions.",
      });
      return;
    }

    const tuitionExists = await Tuition.findById(tuitionId);
    if (!tuitionExists) {
      res.status(404).json({ success: false, message: "Tuition not found." });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    const existingBookmarks = user.bookmarkedTuitions ?? [];
    const currentBookmarkIds = existingBookmarks.map((id) => id.toString());
    const alreadyBookmarked = currentBookmarkIds.includes(tuitionId);

    if (alreadyBookmarked) {
      user.set(
        "bookmarkedTuitions",
        existingBookmarks.filter((id) => id.toString() !== tuitionId)
      );
      await user.save();

      res.status(200).json({
        success: true,
        bookmarked: false,
        message: "Removed from saved tuitions.",
        bookmarkedTuitions: user.bookmarkedTuitions,
      });
      return;
    }

    const userPlan = user.plan || "free";
    if (userPlan === "free" && currentBookmarkIds.length >= 5) {
      res.status(403).json({
        success: false,
        message:
          "Free plan allows up to 5 tuition bookmarks. Upgrade to Pro ($10) for unlimited bookmarks.",
      });
      return;
    }

    user.set("bookmarkedTuitions", [...existingBookmarks, tuitionExists._id]);
    await user.save();

    res.status(200).json({
      success: true,
      bookmarked: true,
      message: "Tuition bookmarked successfully.",
      bookmarkedTuitions: user.bookmarkedTuitions,
    });
  } catch (error) {
    console.error("Toggle bookmark error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update bookmark.",
    });
  }
};

export const getMyBookmarks = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const user = await User.findById(userId).populate("bookmarkedTuitions");
    if (!user) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    res.status(200).json({
      success: true,
      bookmarks: user.bookmarkedTuitions || [],
    });
  } catch (error) {
    console.error("Get bookmarks error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch saved tuitions.",
    });
  }
};