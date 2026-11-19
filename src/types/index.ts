import { Request } from "express";

export type UserRole = "student" | "tutor" | "admin";
export type UserPlan = "free" | "pro";
export type TuitionMode = "Online" | "Offline";
export type TuitionStatus = "Pending" | "Approved" | "Rejected";
export type ApplicationStatus = "Pending" | "Accepted" | "Rejected";
export type TransactionStatus = "Paid" | "Refunded";

export interface JwtPayloadData {
  userId: string;
  email: string;
  role: UserRole;
  plan: UserPlan;
}

export interface AuthRequest extends Request {
  user?: JwtPayloadData;
}