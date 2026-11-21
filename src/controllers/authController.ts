import crypto from "crypto";
import { Response } from "express";
import bcrypt from "bcryptjs";
import { fromNodeHeaders } from "better-auth/node";
import { getAuth } from "../lib/auth.js";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { AuthRequest, UserRole } from "../types/index.js";
import { signAccessToken } from "../utils/jwt.js";

export const registerUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, email, password, phone, role, bio } = req.body;

    if (!name || !email || !password || !phone) {
      res.status(400).json({
        success: false,
        message: "Name, email, password, and phone number are required.",
      });
      return;
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
      return;
    }

    // Public sign-up can only assign 'student' or 'tutor' (never 'admin')
    const assignedRole: Exclude<UserRole, "admin"> =
      role === "tutor" ? "tutor" : "student";

    const hashedPassword = await bcrypt.hash(String(password), 10);

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: String(phone).trim(),
      role: assignedRole,
      plan: "free",
      isVerifiedTutor: false,
      bio: bio ? String(bio).trim() : "",
    });

    const token = signAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      plan: user.plan,
    });

    res.status(201).json({
      success: true,
      message: "Account registered successfully.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        plan: user.plan,
        isVerifiedTutor: user.isVerifiedTutor,
        bio: user.bio,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to register account.",
    });
  }
};

export const loginUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
      return;
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select(
      "+password"
    );

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    const isMatch = await bcrypt.compare(String(password), user.password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    const token = signAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      plan: user.plan,
    });

    res.status(200).json({
      success: true,
      message: "Signed in successfully.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        plan: user.plan,
        isVerifiedTutor: user.isVerifiedTutor,
        bio: user.bio,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to sign in.",
    });
  }
};

export const handleGoogleCallbackSync = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const requestedRole: Exclude<UserRole, "admin"> =
      req.query.role === "tutor" ? "tutor" : "student";

    const session = await getAuth().api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user?.email) {
      res.redirect(
        `${env.clientUrl}/sign-in?error=${encodeURIComponent(
          "Google authentication failed or session was not found."
        )}`
      );
      return;
    }

    const normalizedEmail = session.user.email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      const randomPassword = crypto.randomBytes(24).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = await User.create({
        name: session.user.name?.trim() || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        password: hashedPassword,
        phone: "Not provided",
        role: requestedRole,
        plan: "free",
        isVerifiedTutor: false,
        bio: "",
      });
    } else if (user.role !== "admin" && req.query.role) {
      user.role = requestedRole;
      await user.save();
    }

    const token = signAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      plan: user.plan,
    });

    const redirectUrl = new URL(`${env.clientUrl}/auth/google-callback`);
    redirectUrl.searchParams.set("token", token);
    redirectUrl.searchParams.set(
      "user",
      encodeURIComponent(
        JSON.stringify({
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          plan: user.plan,
          isVerifiedTutor: user.isVerifiedTutor,
          bio: user.bio,
        })
      )
    );

    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("Google callback sync error:", error);
    res.redirect(
      `${env.clientUrl}/sign-in?error=${encodeURIComponent(
        "Failed to complete Google sign-in."
      )}`
    );
  }
};

export const getCurrentUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        plan: user.plan,
        isVerifiedTutor: user.isVerifiedTutor,
        bio: user.bio,
      },
    });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user profile.",
    });
  }
};

export const updateProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    const { name, phone, bio } = req.body;
    const updates: Record<string, string> = {};

    if (name !== undefined) updates.name = String(name).trim();
    if (phone !== undefined) updates.phone = String(phone).trim();
    if (bio !== undefined) updates.bio = String(bio).trim();

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        plan: updatedUser.plan,
        isVerifiedTutor: updatedUser.isVerifiedTutor,
        bio: updatedUser.bio,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile.",
    });
  }
};