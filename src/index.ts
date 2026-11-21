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

// CORS configuration for Next.js frontend
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);

// Stripe webhook must come BEFORE express.json() so raw body is preserved
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

// Better Auth handler (mount before express.json() so request body streams stay intact)
app.all("/api/better-auth/{*splat}", (req, res) => {
  const handler = toNodeHandler(getAuth());
  return handler(req, res);
});

// Body parser
app.use(express.json());

// Health check route
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

// 404 & Global error handlers
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Start server after DB connection
const startServer = async (): Promise<void> => {
  await connectDB();
  app.listen(env.port, () => {
    console.log(`MentorLagbe server running on http://localhost:${env.port}`);
  });
};

startServer();