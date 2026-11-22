
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import mongoose from "mongoose";
import { env } from "../config/env.js";

/* =========================================
   URL HELPERS
========================================= */

const stripTrailingSlash = (url?: string): string | undefined => {
  return url?.trim().replace(/\/+$/, "");
};

const normalizeAuthBaseUrl = (url?: string): string | undefined => {
  const cleaned = stripTrailingSlash(url);

  if (!cleaned) return undefined;

  try {
    return new URL(cleaned).origin;
  } catch {
    throw new Error("Invalid BETTER_AUTH_URL");
  }
};

/* =========================================
   MONGODB CONNECTION
========================================= */

const getMongoDb = () => {
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error(
      "MongoDB connection is not initialized. Connect MongoDB before initializing Better Auth."
    );
  }

  return db as unknown as Parameters<typeof mongodbAdapter>[0];
};

/* =========================================
   ENVIRONMENT CONFIGURATION
========================================= */

const normalizedBaseUrl = normalizeAuthBaseUrl(
  env.betterAuthUrl
);

const normalizedClientUrl = stripTrailingSlash(
  env.clientUrl
);

if (!normalizedBaseUrl) {
  throw new Error("BETTER_AUTH_URL is missing");
}

if (!env.betterAuthSecret) {
  throw new Error("BETTER_AUTH_SECRET is missing");
}

const isHttpsDeployment =
  env.nodeEnv === "production" ||
  normalizedBaseUrl.startsWith("https://") ||
  Boolean(normalizedClientUrl?.startsWith("https://"));

/* =========================================
   TRUSTED ORIGINS
========================================= */

const trustedOrigins = [
  "http://localhost:3000",
  "http://localhost:5000",

  normalizedClientUrl,

  "https://mentorlagbe-client-khaki.vercel.app",

  "https://mentorlagbe-client-9froqksxc-shamim-reja232.vercel.app",
].filter(
  (origin, index, origins): origin is string =>
    Boolean(origin) && origins.indexOf(origin) === index
);

/* =========================================
   BETTER AUTH CONFIGURATION
========================================= */

const createAuth = () =>
  betterAuth({
    // Backend URL
    baseURL: normalizedBaseUrl,

    // Better Auth API prefix
    basePath: "/api/better-auth",

    // Secret
    secret: env.betterAuthSecret,

    // MongoDB
    database: mongodbAdapter(getMongoDb()),

    /* =====================================
       EMAIL & PASSWORD AUTHENTICATION
    ===================================== */

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },

    /* =====================================
       GOOGLE OAUTH
    ===================================== */

    socialProviders: {
      google: {
        clientId: env.googleClientId,
        clientSecret: env.googleClientSecret,
      },
    },

    /* =====================================
       ACCOUNT LINKING
    ===================================== */

    account: {
      accountLinking: {
        enabled: true,

        // Google is a trusted OAuth provider.
        trustedProviders: ["google"],

        // Do not link accounts with different emails.
        allowDifferentEmails: false,

        // Keep existing user profile information.
        updateUserInfoOnLink: false,
      },
    },

    /* =====================================
       USER CONFIGURATION
    ===================================== */

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

    /* =====================================
       TRUSTED ORIGINS
    ===================================== */

    trustedOrigins: (request) => {
      const origin = request?.headers.get("origin");

      if (!origin) {
        return trustedOrigins;
      }

      const cleanedOrigin = stripTrailingSlash(origin) || "";

      if (trustedOrigins.includes(cleanedOrigin)) {
        return trustedOrigins;
      }

      try {
        const parsed = new URL(cleanedOrigin);

        // Allow only MentorLagbe Vercel preview deployments.
        const isAllowedVercelPreview =
          parsed.protocol === "https:" &&
          /^mentorlagbe-client(?:-[a-z0-9-]+)*\.vercel\.app$/i.test(
            parsed.hostname
          );

        if (isAllowedVercelPreview) {
          return [...trustedOrigins, cleanedOrigin];
        }
      } catch {
        // Ignore invalid origins.
      }

      return trustedOrigins;
    },

    /* =====================================
       COOKIE CONFIGURATION
    ===================================== */

    advanced: {
      useSecureCookies: isHttpsDeployment,

      defaultCookieAttributes: {
        sameSite: isHttpsDeployment ? "none" : "lax",
        secure: isHttpsDeployment,
        httpOnly: true,
        path: "/",
      },

      cookies: {
        state: {
          attributes: {
            sameSite: isHttpsDeployment ? "none" : "lax",
            secure: isHttpsDeployment,
            httpOnly: true,
            path: "/",
          },
        },
      },
    },
  });

/* =========================================
   BETTER AUTH INSTANCE TYPE
========================================= */

type BetterAuthInstance = ReturnType<typeof createAuth>;

/* =========================================
   SINGLETON INSTANCE
========================================= */

let authInstance: BetterAuthInstance | null = null;

/* =========================================
   EXPORT AUTH INSTANCE
========================================= */

export const getAuth = (): BetterAuthInstance => {
  if (!authInstance) {
    authInstance = createAuth();
  }

  return authInstance;
};
