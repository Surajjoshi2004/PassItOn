
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { generateAuthToken } from "../utils/token.js";
import { isValidEmail, normalizeEmail } from "../utils/email.js";
import {
  generateVerificationToken,
  getVerificationExpiry,
  hashVerificationToken,
} from "../utils/email-verification-token.js";
import {
  buildVerificationUrl,
  sendVerificationEmail,
} from "../services/email.service.js";
import { RESEND_VERIFICATION_COOLDOWN_SECONDS } from "../config/env.js";

const GENERIC_AUTH_ERROR = "Invalid email or password";

const GENERIC_RESEND_MESSAGE =
  "If that email is registered and unverified, a new verification link has been sent.";

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  college: user.college,
  hostel: user.hostel,
  graduationYear: user.graduationYear,
  role: user.role,
  isEmailVerified: user.isEmailVerified,
  createdAt: user.createdAt,
});

// REGISTER USER
export const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      college,
      hostel,
      graduationYear,
    } = req.body;

    if (!name || !email || !password || !college || !graduationYear) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    const rawToken = generateVerificationToken();

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      college,
      hostel: hostel || "",
      graduationYear,
      isEmailVerified: false,
      emailVerificationToken: hashVerificationToken(rawToken),
      emailVerificationExpires: getVerificationExpiry(),
    });

    let emailSent = false;

    try {
      const emailResult = await sendVerificationEmail({
        to: user.email,
        name: user.name,
        verificationUrl: buildVerificationUrl(rawToken),
      });
      emailSent = emailResult.delivered;
    } catch (emailError) {
      console.error(
        "VERIFICATION EMAIL ERROR:",
        emailError
      );
    }

    return res.status(201).json({
      success: true,
      message: emailSent
        ? "Account created. Check your email to verify your address before logging in."
        : "Account created, but verification email delivery is not configured or failed. Check the server configuration and request a new verification email.",
      data: serializeUser(user),
      emailSent,
    });

  } catch (error) {
    console.error("REGISTER USER ERROR:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (err) => err.message
      );

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// VERIFY EMAIL
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        code: "INVALID_TOKEN",
        message: "Verification token is required",
      });
    }

    const user = await User.findOne({
      emailVerificationToken: hashVerificationToken(token),
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        code: "INVALID_TOKEN",
        message: "This verification link is invalid or has already been used.",
      });
    }

    if (
      !user.emailVerificationExpires ||
      user.emailVerificationExpires <= new Date()
    ) {
      user.emailVerificationToken = null;
      user.emailVerificationExpires = null;

      await user.save();

      return res.status(400).json({
        success: false,
        code: "TOKEN_EXPIRED",
        message: "This verification link has expired. Request a new one.",
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now log in.",
      data: {
        email: user.email,
      },
    });

  } catch (error) {
    console.error("VERIFY EMAIL ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// RESEND VERIFICATION EMAIL
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user || user.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message: GENERIC_RESEND_MESSAGE,
        resendCooldownSeconds: RESEND_VERIFICATION_COOLDOWN_SECONDS,
      });
    }

    const rawToken = generateVerificationToken();

    user.emailVerificationToken = hashVerificationToken(rawToken);
    user.emailVerificationExpires = getVerificationExpiry();

    await user.save();

    try {
      await sendVerificationEmail({
        to: user.email,
        name: user.name,
        verificationUrl: buildVerificationUrl(rawToken),
      });
    } catch (emailError) {
      console.error(
        "RESEND VERIFICATION EMAIL ERROR:",
        emailError
      );
    }

    return res.status(200).json({
      success: true,
      message: GENERIC_RESEND_MESSAGE,
      resendCooldownSeconds: RESEND_VERIFICATION_COOLDOWN_SECONDS,
    });

  } catch (error) {
    console.error("RESEND VERIFICATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// LOGIN USER
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: normalizeEmail(email),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: GENERIC_AUTH_ERROR,
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: GENERIC_AUTH_ERROR,
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        message: "Email verification required. Please verify your email before logging in.",
        data: {
          email: user.email,
        },
      });
    }

    const token = generateAuthToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: serializeUser(user),
      token,
    });

  } catch (error) {
    console.error("LOGIN USER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
