import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import mongoose from "mongoose";
import { env } from "../config/env.js";

const stripTrailingSlash = (url?: string) => url?.trim().replace(/\/+$/, "");

const normalizeAuthBaseUrl = (url?: string) => {
  const cleaned = stripTrailingSlash(url);
  return cleaned ? cleaned.replace(/\/api$/, "") : undefined;
};

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
const normalizedBaseUrl = normalizeAuthBaseUrl(env.betterAuthUrl);
const normalizedClientUrl = stripTrailingSlash(env.clientUrl);

// Allowed frontend & backend origins
const trustedOrigins = [
  "http://localhost:3000",
  "http://localhost:5000",
  normalizedClientUrl,
  normalizedBaseUrl,
  "https://mentorlagbe-client-khaki.vercel.app",
  "https://mentorlagbe-client-9froqksxc-shamim-reja232.vercel.app",
  "https://mentorlagbe-server-fy1s.onrender.com",
].filter((origin, index, origins): origin is string => {
  return Boolean(origin) && origins.indexOf(origin) === index;
});

// Create Better Auth
const createAuth = () =>
  betterAuth({
    // Backend URL (without /api suffix)
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

    // Allowed origins (supports static & mentorlagbe-client*.vercel.app)
    trustedOrigins: (request) => {
      const origin = request?.headers.get("origin");
      if (!origin) return trustedOrigins;

      const cleanedOrigin = stripTrailingSlash(origin) || "";
      if (trustedOrigins.includes(cleanedOrigin)) {
        return trustedOrigins;
      }

      try {
        const parsed = new URL(cleanedOrigin);
        if (
          parsed.protocol === "https:" &&
          parsed.hostname.startsWith("mentorlagbe-client") &&
          parsed.hostname.endsWith(".vercel.app")
        ) {
          return [...trustedOrigins, cleanedOrigin];
        }
      } catch {
        // Ignore invalid origin header
      }

      return trustedOrigins;
    },

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