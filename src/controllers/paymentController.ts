import { Request, Response } from "express";
import Stripe from "stripe";
import { env } from "../config/env.js";
import { PRO_PLANS, stripe } from "../config/stripe.js";
import { User } from "../models/User.js";
import { Tuition } from "../models/Tuition.js";
import { Transaction } from "../models/Transaction.js";
import { AuthRequest } from "../types/index.js";

// Helper to upgrade user and record transaction idempotently
const fulfillProUpgrade = async (params: {
  userId: string;
  planKey: "tutor_pro" | "student_pro";
  sessionId: string;
}) => {
  const existingTx = await Transaction.findOne({
    stripeSessionId: params.sessionId,
  });
  if (existingTx) return existingTx;

  const user = await User.findById(params.userId);
  if (!user) return null;

  const selectedPlan =
    params.planKey === "tutor_pro" ? PRO_PLANS.tutor : PRO_PLANS.student;

  user.plan = "pro";
  if (user.role === "tutor") {
    user.isVerifiedTutor = true;
    await Tuition.updateMany(
      { tutorId: user._id },
      { $set: { tutorVerified: true } }
    );
  }
  await user.save();

  const transaction = await Transaction.create({
    userId: user._id,
    userName: user.name,
    userEmail: user.email,
    role: user.role === "tutor" ? "tutor" : "student",
    planKey: selectedPlan.key,
    planName: selectedPlan.name,
    amount: selectedPlan.amountUsd,
    currency: "usd",
    stripeSessionId: params.sessionId,
    status: "Paid",
  });

  return transaction;
};

// Create Stripe Checkout Session ($15 Tutor Pro or $10 Student Pro)
export const createCheckoutSession = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    if (!stripe) {
      res.status(500).json({
        success: false,
        message: "Stripe is not configured on the server (.env STRIPE_SECRET_KEY).",
      });
      return;
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    if (user.role === "admin") {
      res.status(400).json({
        success: false,
        message: "Admin accounts do not require Pro subscriptions.",
      });
      return;
    }

    if (user.plan === "pro") {
      res.status(400).json({
        success: false,
        message: "You are already on the Pro Plan!",
      });
      return;
    }

    const selectedPlan =
      user.role === "tutor" ? PRO_PLANS.tutor : PRO_PLANS.student;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: selectedPlan.name,
              description:
                user.role === "tutor"
                  ? "Unlimited tuition posts + Verified Tutor Badge on MentorLagbe"
                  : "Priority tuition applications & faster tutor responses on MentorLagbe",
            },
            unit_amount: selectedPlan.unitAmountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: user._id.toString(),
        planKey: selectedPlan.key,
      },
      success_url: `${env.clientUrl}/pricing?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.clientUrl}/pricing?payment=cancelled`,
    });

    res.status(200).json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to initiate Stripe checkout session.";
    res.status(500).json({
      success: false,
      message,
    });
  }
};

// Verify Stripe Checkout Session on frontend redirect (fallback if webhook hasn't fired yet)
export const verifyCheckoutSession = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    const { sessionId } = req.body;
    if (!sessionId) {
      res.status(400).json({
        success: false,
        message: "Stripe sessionId is required.",
      });
      return;
    }

    if (!stripe) {
      res.status(500).json({
        success: false,
        message: "Stripe is not configured on the server.",
      });
      return;
    }

    const session = await stripe.checkout.sessions.retrieve(String(sessionId));
    if (session.payment_status !== "paid") {
      res.status(400).json({
        success: false,
        message: "Payment is not completed yet.",
      });
      return;
    }

    const metaUserId = session.metadata?.userId || req.user.userId;
    const planKey =
      session.metadata?.planKey === "tutor_pro" ? "tutor_pro" : "student_pro";

    const transaction = await fulfillProUpgrade({
      userId: metaUserId,
      planKey,
      sessionId: session.id,
    });

    const updatedUser = await User.findById(metaUserId);

    res.status(200).json({
      success: true,
      message: "Pro Plan activated successfully!",
      user: updatedUser,
      transaction,
    });
  } catch (error) {
    console.error("Verify checkout session error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to verify Stripe payment session.";
    res.status(500).json({
      success: false,
      message,
    });
  }
};

// Stripe Webhook Handler (must receive raw request body)
export const handleStripeWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  if (!stripe || !env.stripeWebhookSecret) {
    res.status(400).send("Stripe webhook secret not configured.");
    return;
  }

  const signature = req.headers["stripe-signature"];
  if (!signature) {
    res.status(400).send("Missing stripe-signature header.");
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      env.stripeWebhookSecret
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    res.status(400).send("Webhook signature verification failed.");
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const planKey =
      session.metadata?.planKey === "tutor_pro" ? "tutor_pro" : "student_pro";

    if (userId) {
      await fulfillProUpgrade({
        userId,
        planKey,
        sessionId: session.id,
      });
    }
  }

  res.status(200).json({ received: true });
};