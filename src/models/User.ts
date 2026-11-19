import mongoose, { Document, Schema } from "mongoose";
import { UserPlan, UserRole } from "../types/index.js";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: UserRole;
  plan: UserPlan;
  isVerifiedTutor: boolean;
  bio: string;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    phone: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["student", "tutor", "admin"],
      default: "student",
    },
    plan: {
      type: String,
      enum: ["free", "pro"],
      default: "free",
    },
    isVerifiedTutor: { type: Boolean, default: false },
    bio: { type: String, default: "", trim: true },
    stripeCustomerId: { type: String, default: "" },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", userSchema);