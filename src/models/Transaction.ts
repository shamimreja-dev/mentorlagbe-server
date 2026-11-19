import mongoose, { Document, Schema } from "mongoose";
import { TransactionStatus, UserRole } from "../types/index.js";

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  userEmail: string;
  role: Exclude<UserRole, "admin">;
  planKey: "tutor_pro" | "student_pro";
  planName: "Pro Tutor Plan" | "Pro Student Plan";
  amount: number;
  currency: "usd";
  stripeSessionId: string;
  status: TransactionStatus;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true, trim: true },
    userEmail: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ["student", "tutor"], required: true },
    planKey: {
      type: String,
      enum: ["tutor_pro", "student_pro"],
      required: true,
    },
    planName: {
      type: String,
      enum: ["Pro Tutor Plan", "Pro Student Plan"],
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ["usd"], default: "usd" },
    stripeSessionId: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["Paid", "Refunded"],
      default: "Paid",
    },
  },
  { timestamps: true }
);

export const Transaction = mongoose.model<ITransaction>(
  "Transaction",
  transactionSchema
);