import { Request, Response } from "express";
import { Tuition } from "../models/Tuition.js";
import { User } from "../models/User.js";
import { AuthRequest } from "../types/index.js";

// Public / Filtered: Get tuitions (defaults to Approved when status query is omitted)
export const getAllApprovedTuitions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { search, subject, mode, maxFee, status } = req.query;

    const filter: Record<string, unknown> = {};

    if (!status) {
      filter.status = "Approved";
    } else if (String(status) !== "All") {
      const normalizedStatus = String(status).trim();
      const allowedStatuses = ["Pending", "Approved", "Rejected"];
      const matched = allowedStatuses.find(
        (s) => s.toLowerCase() === normalizedStatus.toLowerCase()
      );
      filter.status = matched || normalizedStatus;
    }

    if (subject && subject !== "All") {
      filter.subject = String(subject);
    }

    if (mode && mode !== "All") {
      filter.mode = String(mode);
    }

    if (maxFee && !Number.isNaN(Number(maxFee))) {
      filter.monthlyFee = { $lte: Number(maxFee) };
    }

    if (search && String(search).trim()) {
      const regex = new RegExp(String(search).trim(), "i");
      filter.$or = [
        { title: regex },
        { subject: regex },
        { tutorName: regex },
        { location: regex },
        { classLevel: regex },
      ];
    }

    const tuitions = await Tuition.find(filter).sort({
      tutorVerified: -1,
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: tuitions.length,
      tuitions,
    });
  } catch (error) {
    console.error("Get tuitions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tuitions.",
    });
  }
};

// Public: Get single tuition details by ID
export const getTuitionById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const tuition = await Tuition.findById(req.params.id).populate(
      "tutorId",
      "name email phone bio plan isVerifiedTutor"
    );

    if (!tuition) {
      res.status(404).json({
        success: false,
        message: "Tuition listing not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      tuition,
    });
  } catch (error) {
    console.error("Get tuition by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tuition details.",
    });
  }
};

// Tutor: Get own tuitions (Pending, Approved, Rejected)
export const getMyTutorTuitions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    const tuitions = await Tuition.find({ tutorId: req.user.userId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: tuitions.length,
      tuitions,
    });
  } catch (error) {
    console.error("Get tutor tuitions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch your tuitions.",
    });
  }
};

// Tutor: Create a new tuition (Enforces Free Plan max 2 posts limit)
export const createTuition = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    const tutor = await User.findById(req.user.userId);
    if (!tutor || tutor.role !== "tutor") {
      res.status(403).json({
        success: false,
        message: "Only tutors can post tuition listings.",
      });
      return;
    }

    // Free Plan Restriction: Maximum 2 tuition posts allowed
    if (tutor.plan === "free") {
      const existingCount = await Tuition.countDocuments({
        tutorId: tutor._id,
      });
      if (existingCount >= 2) {
        res.status(403).json({
          success: false,
          code: "FREE_PLAN_LIMIT_REACHED",
          message:
            "Free Tutor Plan allows up to 2 tuition posts. Upgrade to Pro Tutor Plan ($15) for unlimited posts.",
        });
        return;
      }
    }

    const {
      title,
      subject,
      classLevel,
      mode,
      location,
      monthlyFee,
      daysPerWeek,
      bannerImage,
      description,
    } = req.body;

    if (
      !title ||
      !subject ||
      !classLevel ||
      !mode ||
      !location ||
      !monthlyFee ||
      !daysPerWeek ||
      !description
    ) {
      res.status(400).json({
        success: false,
        message: "All required tuition fields must be provided.",
      });
      return;
    }

    const tuition = await Tuition.create({
      title: String(title).trim(),
      tutorId: tutor._id,
      tutorName: tutor.name,
      tutorVerified: tutor.plan === "pro" || tutor.isVerifiedTutor,
      subject: String(subject).trim(),
      classLevel: String(classLevel).trim(),
      mode: mode === "Offline" ? "Offline" : "Online",
      location: String(location).trim(),
      monthlyFee: Number(monthlyFee),
      daysPerWeek: Number(daysPerWeek),
      bannerImage: bannerImage ? String(bannerImage).trim() : undefined,
      description: String(description).trim(),
      status: "Pending",
    });

    res.status(201).json({
      success: true,
      message: "Tuition submitted for admin approval (status: Pending).",
      tuition,
    });
  } catch (error) {
    console.error("Create tuition error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create tuition listing.",
    });
  }
};

// Admin: Approve or Reject a tuition listing
export const moderateTuitionStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    const { status } = req.body as { status?: string };
    const validStatuses = ["Pending", "Approved", "Rejected"];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: "Status must be Pending, Approved, or Rejected.",
      });
      return;
    }

    const tuition = await Tuition.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!tuition) {
      res.status(404).json({
        success: false,
        message: "Tuition listing not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Tuition marked as ${status}.`,
      tuition,
    });
  } catch (error) {
    console.error("Moderate tuition error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update tuition status.",
    });
  }
};

// Tutor / Admin: Delete tuition
export const deleteOwnTuition = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    const query =
      req.user.role === "admin"
        ? { _id: req.params.id }
        : { _id: req.params.id, tutorId: req.user.userId };

    const tuition = await Tuition.findOneAndDelete(query);

    if (!tuition) {
      res.status(404).json({
        success: false,
        message: "Tuition not found or you do not have permission to delete it.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Tuition listing deleted successfully.",
    });
  } catch (error) {
    console.error("Delete own tuition error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete tuition.",
    });
  }
};