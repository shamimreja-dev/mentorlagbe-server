import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import mongoose from "mongoose";
import { env } from "../config/env.js";

const stripTrailingSlash = (url?: string) => url?.trim().replace(/\/+$/, "");

// Get the existing MongoDB connection
const getMongoDb = () => {
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error(
      "MongoDB connection is not initialized. Connect MongoDB before initializing Better Auth."
    );
  }

  return db as unknown as Parameters<typeof mongodbAdapter>[0];
};

const isProduction = env.nodeEnv === "production";
const normalizedBaseUrl = stripTrailingSlash(env.betterAuthUrl);

// Allowed frontend & backend origins
const trustedOrigins = [
  "http://localhost:3000",
  "http://localhost:5000",
  stripTrailingSlash(env.clientUrl),
  normalizedBaseUrl,
  "https://mentorlagbe-client-khaki.vercel.app",
  "https://mentorlagbe-server-fy1s.onrender.com",
].filter((origin, index, origins): origin is string => {
  return Boolean(origin) && origins.indexOf(origin) === index;
});

// Create Better Auth
const createAuth = () =>
  betterAuth({
    // Backend URL
    baseURL: normalizedBaseUrl,

    // Better Auth API prefix
    basePath: "/api/better-auth",

    // Authentication secret
    secret: env.betterAuthSecret,

    // MongoDB database adapter
    database: mongodbAdapter(getMongoDb()),

    // Email and Password Authentication
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },

    // Google OAuth
    socialProviders: {
      google: {
        clientId: env.googleClientId,
        clientSecret: env.googleClientSecret,
      },
    },

    // User configuration
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "student",
          input: false,
        },
      },
    },

    // Allowed origins
    trustedOrigins,

    // Cookie configuration for cross-origin requests
    advanced: {
      useSecureCookies: isProduction,
      defaultCookieAttributes: {
        sameSite: isProduction ? "none" : "lax",
        secure: isProduction,
        httpOnly: true,
        path: "/",
      },
    },
  });

// Better Auth instance type
type BetterAuthInstance = ReturnType<typeof createAuth>;

// Singleton instance
let authInstance: BetterAuthInstance | null = null;

// Export Better Auth instance
export const getAuth = (): BetterAuthInstance => {
  if (!authInstance) {
    authInstance = createAuth();
  }

  return authInstance;
};