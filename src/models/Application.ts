import mongoose, { Document, Schema } from "mongoose";
import { ApplicationStatus } from "../types/index.js";

export interface IApplication extends Document {
  tuitionId: mongoose.Types.ObjectId;
  tuitionTitle: string;
  tutorId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  studentName: string;
  studentEmail: string;
  phone: string;
  preferredSchedule: string;
  note: string;
  isPriority: boolean;
  status: ApplicationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const applicationSchema = new Schema<IApplication>(
  {
    tuitionId: { type: Schema.Types.ObjectId, ref: "Tuition", required: true },
    tuitionTitle: { type: String, required: true, trim: true },
    tutorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    studentName: { type: String, required: true, trim: true },
    studentEmail: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    preferredSchedule: { type: String, required: true, trim: true },
    note: { type: String, default: "", trim: true },
    isPriority: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

export const Application = mongoose.model<IApplication>(
  "Application",
  applicationSchema
);