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