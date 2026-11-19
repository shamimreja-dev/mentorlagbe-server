import { Response } from "express";
import { User } from "../models/User.js";
import { Tuition } from "../models/Tuition.js";
import { Application } from "../models/Application.js";
import { Transaction } from "../models/Transaction.js";
import { AuthRequest } from "../types/index.js";

// Admin: Dashboard Overview Stats
export const getAdminStats = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const [
      totalUsers,
      totalStudents,
      totalTutors,
      proUsers,
      totalTuitions,
      pendingTuitions,
      approvedTuitions,
      totalApplications,
      paidTransactions,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "tutor" }),
      User.countDocuments({ plan: "pro" }),
      Tuition.countDocuments(),
      Tuition.countDocuments({ status: "Pending" }),
      Tuition.countDocuments({ status: "Approved" }),
      Application.countDocuments(),
      Transaction.find({ status: "Paid" }).select("amount"),
    ]);

    const totalRevenueUsd = paidTransactions.reduce(
      (sum, tx) => sum + tx.amount,
      0
    );

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalStudents,
        totalTutors,
        proUsers,
        totalTuitions,
        pendingTuitions,
        approvedTuitions,
        totalApplications,
        totalRevenueUsd,
        completedPaymentsCount: paidTransactions.length,
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin dashboard stats.",
    });
  }
};

// Admin: Get all users
export const getAllUsers = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Admin get users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users.",
    });
  }
};

// Admin: Update user role or plan
export const updateUserRoleOrPlan = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { role, plan } = req.body;
    const updates: Record<string, unknown> = {};

    if (role && ["student", "tutor", "admin"].includes(role)) {
      updates.role = role;
    }

    if (plan && ["free", "pro"].includes(plan)) {
      updates.plan = plan;
      updates.isVerifiedTutor = plan === "pro";
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    );

    if (!updatedUser) {
      res.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    if (plan && updatedUser.role === "tutor") {
      await Tuition.updateMany(
        { tutorId: updatedUser._id },
        { $set: { tutorVerified: plan === "pro" } }
      );
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Admin update user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user.",
    });
  }
};

// Admin: Delete user
export const deleteUserByAdmin = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.userId === req.params.id) {
      res.status(400).json({
        success: false,
        message: "You cannot delete your own admin account.",
      });
      return;
    }

    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      res.status(404).json({
        success: false,
        message: "User not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Removed user ${deletedUser.name}.`,
    });
  } catch (error) {
    console.error("Admin delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user.",
    });
  }
};

// Admin: Get all tuitions (Pending, Approved, Rejected)
export const getAllTuitionsForAdmin = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const tuitions = await Tuition.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: tuitions.length,
      tuitions,
    });
  } catch (error) {
    console.error("Admin get tuitions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tuitions.",
    });
  }
};

// Admin: Approve or Reject a tuition
export const moderateTuitionStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { status } = req.body;
    if (!["Pending", "Approved", "Rejected"].includes(status)) {
      res.status(400).json({
        success: false,
        message: "Invalid status. Allowed: Pending, Approved, Rejected.",
      });
      return;
    }

    const tuition = await Tuition.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
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
      message: `Tuition status updated to ${status}.`,
      tuition,
    });
  } catch (error) {
    console.error("Admin moderate tuition error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to moderate tuition status.",
    });
  }
};

// Admin: Delete any tuition
export const deleteTuitionByAdmin = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const deleted = await Tuition.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({
        success: false,
        message: "Tuition listing not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Tuition listing deleted by admin.",
    });
  } catch (error) {
    console.error("Admin delete tuition error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete tuition.",
    });
  }
};

// Admin: Get all Stripe transactions
export const getAllTransactions = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const transactions = await Transaction.find().sort({ createdAt: -1 });
    const totalRevenueUsd = transactions
      .filter((t) => t.status === "Paid")
      .reduce((sum, t) => sum + t.amount, 0);

    res.status(200).json({
      success: true,
      count: transactions.length,
      totalRevenueUsd,
      transactions,
    });
  } catch (error) {
    console.error("Admin get transactions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch transactions.",
    });
  }
};