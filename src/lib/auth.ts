import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import mongoose from "mongoose";
import { env } from "../config/env.js";

const getMongoDb = () => {
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("MongoDB connection is not initialized yet.");
  }

  return db as unknown as Parameters<typeof mongodbAdapter>[0];
};

const isProduction = process.env.NODE_ENV === "production";

const createAuth = () =>
  betterAuth({
    baseURL: env.betterAuthUrl,
    basePath: "/api/better-auth",
    secret: env.betterAuthSecret,

    database: mongodbAdapter(getMongoDb()),

    socialProviders: {
      google: {
        clientId: env.googleClientId,
        clientSecret: env.googleClientSecret,
      },
    },

    trustedOrigins: [
      env.clientUrl,
      "https://mentorlagbe-client-khaki.vercel.app",
      "https://mentorlagbe-server-fy1s.onrender.com",
    ],

    advanced: {
      defaultCookieAttributes: {
        sameSite: isProduction ? "none" : "lax",
        secure: isProduction,
        httpOnly: true,
        path: "/",
      },
    },
  });

type BetterAuthInstance = ReturnType<typeof createAuth>;

let authInstance: BetterAuthInstance | null = null;

export const getAuth = (): BetterAuthInstance => {
  if (!authInstance) {
    authInstance = createAuth();
  }

  return authInstance;
};