
import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

const requiredEnv = (key: string, fallback = "") => {
  const value = process.env[key] || fallback;

  if (isProduction && !value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

export const env = {
  port: Number(process.env.PORT) || 5000,

  nodeEnv: process.env.NODE_ENV || "development",

  mongodbUri: requiredEnv(
    "MONGODB_URI",
    "mongodb://127.0.0.1:27017/mentorlagbe"
  ),

  jwtSecret: requiredEnv(
    "JWT_SECRET",
    "mentorlagbe_local_development_jwt_secret"
  ),

  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",

  clientUrl:
    process.env.CLIENT_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:3000",

  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",

  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",

  betterAuthSecret: requiredEnv(
    "BETTER_AUTH_SECRET",
    "mentorlagbe_local_development_auth_secret"
  ),

  betterAuthUrl: requiredEnv(
    "BETTER_AUTH_URL",
    "http://localhost:5000"
  ),

  googleClientId: requiredEnv("GOOGLE_CLIENT_ID"),

  googleClientSecret: requiredEnv("GOOGLE_CLIENT_SECRET"),
};
