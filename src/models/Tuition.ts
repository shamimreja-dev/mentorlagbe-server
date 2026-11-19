import mongoose, { Document, Schema } from "mongoose";
import { TuitionMode, TuitionStatus } from "../types/index.js";

export interface ITuition extends Document {
  title: string;
  tutorId: mongoose.Types.ObjectId;
  tutorName: string;
  tutorVerified: boolean;
  subject: string;
  classLevel: string;
  mode: TuitionMode;
  location: string;
  monthlyFee: number;
  daysPerWeek: number;
  bannerImage: string;
  description: string;
  status: TuitionStatus;
  createdAt: Date;
  updatedAt: Date;
}

const tuitionSchema = new Schema<ITuition>(
  {
    title: { type: String, required: true, trim: true },
    tutorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tutorName: { type: String, required: true, trim: true },
    tutorVerified: { type: Boolean, default: false },
    subject: { type: String, required: true, trim: true },
    classLevel: { type: String, required: true, trim: true },
    mode: { type: String, enum: ["Online", "Offline"], required: true },
    location: { type: String, required: true, trim: true },
    monthlyFee: { type: Number, required: true, min: 1 },
    daysPerWeek: { type: Number, required: true, min: 1, max: 7 },
    bannerImage: {
      type: String,
      default:
        "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=800",
    },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

export const Tuition = mongoose.model<ITuition>("Tuition", tuitionSchema);