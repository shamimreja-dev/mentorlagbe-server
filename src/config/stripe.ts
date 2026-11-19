import Stripe from "stripe";
import { env } from "./env.js";

export const stripe = env.stripeSecretKey
  ? new Stripe(env.stripeSecretKey)
  : null;

export const PRO_PLANS = {
  tutor: {
    key: "tutor_pro",
    name: "Pro Tutor Plan",
    role: "tutor" as const,
    amountUsd: 15,
    unitAmountCents: 1500,
  },
  student: {
    key: "student_pro",
    name: "Pro Student Plan",
    role: "student" as const,
    amountUsd: 10,
    unitAmountCents: 1000,
  },
} as const;