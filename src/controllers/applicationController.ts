import { Response } from "express";
import { Application } from "../models/Application.js";
import { Tuition } from "../models/Tuition.js";
import { User } from "../models/User.js";
import { AuthRequest } from "../types/index.js";

// Student: Apply to an Approved tuition
export const applyForTuition = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    const { tuitionId, phone, preferredSchedule, note } = req.body;

    if (!tuitionId || !preferredSchedule) {
      res.status(400).json({
        success: false,
        message: "Tuition ID and preferred schedule are required.",
      });
      return;
    }

    const student = await User.findById(req.user.userId);
    if (!student || student.role !== "student") {
      res.status(403).json({
        success: false,
        message: "Only students can apply for tuitions.",
      });
      return;
    }

    const tuition = await Tuition.findById(tuitionId);
    if (!tuition || tuition.status !== "Approved") {
      res.status(404).json({
        success: false,
        message: "Approved tuition listing not found.",
      });
      return;
    }

    const alreadyApplied = await Application.findOne({
      tuitionId: tuition._id,
      studentId: student._id,
    });

    if (alreadyApplied) {
      res.status(409).json({
        success: false,
        message: "You have already applied to this tuition.",
      });
      return;
    }

    const application = await Application.create({
      tuitionId: tuition._id,
      tuitionTitle: tuition.title,
      tutorId: tuition.tutorId,
      studentId: student._id,
      studentName: student.name,
      studentEmail: student.email,
      phone: phone ? String(phone).trim() : student.phone,
      preferredSchedule: String(preferredSchedule).trim(),
      note: note ? String(note).trim() : "",
      isPriority: student.plan === "pro",
      status: "Pending",
    });

    res.status(201).json({
      success: true,
      message:
        student.plan === "pro"
          ? "Priority application submitted successfully!"
          : "Application submitted successfully!",
      application,
    });
  } catch (error) {
    console.error("Apply tuition error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit tuition application.",
    });
  }
};

// Student: View own submitted applications
export const getMyStudentApplications = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    const applications = await Application.find({
      studentId: req.user.userId,
    })
      .populate("tuitionId", "title subject mode location monthlyFee")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    console.error("Get student applications error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch your applications.",
    });
  }
};

// Tutor: View incoming student applications (Pro priority applications shown first)
export const getTutorIncomingApplications = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    const applications = await Application.find({
      tutorId: req.user.userId,
    }).sort({ isPriority: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    console.error("Get tutor applications error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch incoming applications.",
    });
  }
};

// Tutor: Accept or Reject a student application
export const updateApplicationStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    const { status } = req.body;
    if (status !== "Accepted" && status !== "Rejected") {
      res.status(400).json({
        success: false,
        message: "Status must be either 'Accepted' or 'Rejected'.",
      });
      return;
    }

    const application = await Application.findOneAndUpdate(
      { _id: req.params.id, tutorId: req.user.userId },
      { $set: { status } },
      { new: true }
    );

    if (!application) {
      res.status(404).json({
        success: false,
        message: "Application not found or access denied.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Application ${status.toLowerCase()} successfully.`,
      application,
    });
  } catch (error) {
    console.error("Update application status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update application status.",
    });
  }
};