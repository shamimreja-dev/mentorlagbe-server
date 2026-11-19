import { NextFunction, Response } from "express";
import { AuthRequest, UserRole } from "../types/index.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { User } from "../models/User.js";

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Authentication token missing or invalid.",
      });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.userId).select(
      "_id email role plan"
    );
    if (!user) {
      res.status(401).json({
        success: false,
        message: "User associated with this token no longer exists.",
      });
      return;
    }

    req.user = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      plan: user.plan,
    };

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }
};

export const authorizeRoles = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Unauthorized access.",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: requires role [${allowedRoles.join(", ")}].`,
      });
      return;
    }

    next();
  };
};