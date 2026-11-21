
import express from "express";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";

import { getAuth } from "./lib/auth.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";

import { handleStripeWebhook } from "./controllers/paymentController.js";

import authRoutes from "./routes/authRoutes.js";
import tuitionRoutes from "./routes/tuitionRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import bookmarkRoutes from "./routes/bookmarkRoutes.js";

import {
  globalErrorHandler,
  notFoundHandler,
} from "./middleware/errorMiddleware.js";

const app = express();

// Render / reverse proxy support
app.set("trust proxy", 1);

// Allowed frontend origins
const allowedOrigins = [
  env.clientUrl,
  ...(env.nodeEnv !== "production" ? ["http://localhost:3000"] : []),
];

// CORS
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Stripe webhook: raw body must be preserved
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

// Better Auth handler
// Keep this BEFORE express.json()
app.all("/api/better-auth/{*splat}", (req, res) => {
  const handler = toNodeHandler(getAuth());
  return handler(req, res);
});

// JSON body parser
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    service: "MentorLagbe Server",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/tuitions", tuitionRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/bookmarks", bookmarkRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(globalErrorHandler);

// Start server after MongoDB connection
const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    app.listen(env.port, () => {
      console.log(
        `MentorLagbe server running on port ${env.port}`
      );
      console.log(`Better Auth: ${env.betterAuthUrl}/api/better-auth`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
