import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { ALLOWED_EMAIL_DOMAINS, PORT } from "../config/env.js";
import { generateAuthToken } from "../utils/token.js";

const EMAIL_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

const generateEmailToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const isEmailAllowed = (email) => {
  const domain = email.split("@")[1];
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, college, hostel, graduationYear } = req.body;

    if (!name || !email || !password || !college || !graduationYear) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    if (!isEmailAllowed(email)) {
      return res.status(403).json({
        success: false,
        message: `Only approved college emails are allowed. Allowed domains: ${ALLOWED_EMAIL_DOMAINS.join(", ")}`,
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    const rawToken = generateEmailToken();
    const hashedToken = hashToken(rawToken);

    const user = await User.create({
      name,
      email,
      password,
      college,
      hostel: hostel || "",
      graduationYear,
      emailVerificationToken: hashedToken,
      emailVerificationExpires: new Date(Date.now() + EMAIL_TOKEN_EXPIRY_MS),
    });

    const verifyUrl = `http://localhost:${PORT}/api/auth/verify-email/${rawToken}`;
    console.log(`[DEV] Verify email for ${email}: ${verifyUrl}`);

    return res.status(201).json({
      success: true,
      message: "User registered successfully. Please verify your email.",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        college: user.college,
        hostel: user.hostel,
        graduationYear: user.graduationYear,
        role: user.role,
        createdAt: user.createdAt,
      },
      dev: {
        verificationUrl: verifyUrl,
      },
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
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

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required",
      });
    }

    const hashedToken = hashToken(token);

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If the email is registered, a verification link has been sent",
      });
    }

    if (user.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message: "If the email is registered, a verification link has been sent",
      });
    }

    const rawToken = generateEmailToken();
    const hashedToken = hashToken(rawToken);

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = new Date(Date.now() + EMAIL_TOKEN_EXPIRY_MS);
    await user.save();

    const verifyUrl = `http://localhost:${PORT}/api/auth/verify-email/${rawToken}`;
    console.log(`[DEV] Resend verification for ${email}: ${verifyUrl}`);

    return res.status(200).json({
      success: true,
      message: "If the email is registered, a verification link has been sent",
      dev: {
        verificationUrl: verifyUrl,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const GENERIC_AUTH_ERROR = "Invalid email or password";

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: GENERIC_AUTH_ERROR,
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: GENERIC_AUTH_ERROR,
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in",
      });
    }

    const token = generateAuthToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        college: user.college,
        hostel: user.hostel,
        graduationYear: user.graduationYear,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
