import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { randomBytes, randomInt, createHash } from "node:crypto";

import sendEmail from "../config/brevo.js";
import verificationEmail from "../utils/emailTemplates/verificationEmail.js";
import welcomeEmail from "../utils/emailTemplates/welcomeEmail.js";
import passwordResetEmail from "../utils/emailTemplates/passwordResetEmail.js";
import { uploadAvatarBuffer } from "../services/avatar.service.js";

// ==========================================
// Sanitize User
// ==========================================

const sanitizeUser = (user) => {
  const userData = user.toObject();

  delete userData.password;
  delete userData.refreshTokenHash;
  delete userData.refreshTokenExpiresAt;
  delete userData.emailVerificationTokenHash;
  delete userData.emailVerificationExpiresAt;
  delete userData.passwordResetOtpHash;
  delete userData.passwordResetOtpExpiresAt;
  delete userData.passwordResetOtpAttempts;

  return userData;
};

// ==========================================
// Register New User
// ==========================================

export const registerUser = async ({ name, email, password, avatarFile }) => {
  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({
    email: normalizedEmail,
  });

  if (existingUser) {
    throw new Error("Email is already registered");
  }

  const avatarUrl = avatarFile ? await uploadAvatarBuffer(avatarFile) : "";

  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
    avatar: avatarUrl,
  });

  await sendVerificationEmail(user);

  return {
    user: sanitizeUser(user),
    emailVerificationRequired: true,
  };
};

// ==========================================
// Verify Login Credentials
// ==========================================

export const verifyUserCredentials = async ({
  email,
  password,
  expectedRole = "user",
}) => {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({
    email: normalizedEmail,
  }).select("+password");

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }

  if (!user.isEmailVerified) {
    throw new Error("Please verify your email before logging in");
  }

  // Admin login accepts only Admin accounts.
  if (expectedRole === "admin" && user.role !== "admin") {
    throw new Error("Invalid email or password");
  }

  // Public login accepts only Viewer and Host accounts.
  if (expectedRole === "user" && !["viewer", "host"].includes(user.role)) {
    throw new Error("Invalid email or password");
  }

  return createTokenPair(user);
};

// ==========================================
// Create Access + Refresh Token Pair
// ==========================================

export const createTokenPair = async (user) => {
  const accessToken = jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
    },
  );

  const refreshToken = jwt.sign(
    {
      sub: user._id.toString(),
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
    },
  );

  const refreshTokenHash = createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  const decodedToken = jwt.decode(refreshToken);

  user.refreshTokenHash = refreshTokenHash;
  user.refreshTokenExpiresAt = new Date(decodedToken.exp * 1000);

  await user.save();

  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user),
  };
};

// ==========================================
// Refresh Access Token
// ==========================================

export const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new Error("Refresh token is required");
  }

  let decoded;

  try {
    decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    throw new Error("Invalid or expired refresh token");
  }

  const tokenHash = createHash("sha256").update(refreshToken).digest("hex");

  const user = await User.findById(decoded.sub).select(
    "+refreshTokenHash +refreshTokenExpiresAt",
  );

  if (
    !user ||
    !user.refreshTokenHash ||
    user.refreshTokenHash !== tokenHash ||
    !user.refreshTokenExpiresAt ||
    user.refreshTokenExpiresAt <= new Date()
  ) {
    throw new Error("Invalid or expired refresh token");
  }

  return createTokenPair(user);
};

// ==========================================
// Logout User
// ==========================================

export const logoutUser = async (refreshToken) => {
  if (!refreshToken) {
    return;
  }

  const tokenHash = createHash("sha256").update(refreshToken).digest("hex");

  await User.findOneAndUpdate(
    { refreshTokenHash: tokenHash },
    {
      $set: {
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
    },
  );
};

// ==========================================
// Send Email Verification
// ==========================================

export const sendVerificationEmail = async (user) => {
  const verificationToken = randomBytes(32).toString("hex");

  const tokenHash = createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  user.emailVerificationTokenHash = tokenHash;
  user.emailVerificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await user.save();

  const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

  const verificationUrl =
    `${CLIENT_URL}/verify-email` +
    `?email=${encodeURIComponent(user.email)}` +
    `&token=${verificationToken}`;

  await sendEmail({
    to: user.email,
    subject: "Verify Your Email - Netflix AI Watch Spaces",
    htmlContent: verificationEmail({
      name: user.name,
      verificationUrl,
    }),
  });

  return {
    success: true,
    message: "Verification email sent successfully",
  };
};

// ==========================================
// Send Welcome Email
// ==========================================

export const sendWelcomeEmail = async (user) => {
  if (user.welcomeEmailSentAt) return;

  try {
    await sendEmail({
      to: user.email,
      subject: "Welcome to Netflix AI Watch Spaces!",
      htmlContent: welcomeEmail({
        name: user.name,
      }),
    });

    user.welcomeEmailSentAt = new Date();
    await user.save();

    console.log(`Welcome email sent successfully to ${user.email}`);
  } catch (error) {
    console.error("Welcome email delivery failed:", error.message);
  }
};

// ==========================================
// Verify Email
// ==========================================

export const verifyEmail = async ({ email, token }) => {
  if (!email || !token) {
    throw new Error("Email and verification token are required");
  }

  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({
    email: normalizedEmail,
  }).select("+emailVerificationTokenHash +emailVerificationExpiresAt");

  if (!user) {
    throw new Error("Invalid verification request");
  }

  if (user.isEmailVerified) {
    throw new Error("Email is already verified");
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  if (
    user.emailVerificationTokenHash !== tokenHash ||
    !user.emailVerificationExpiresAt ||
    user.emailVerificationExpiresAt <= new Date()
  ) {
    throw new Error("Invalid or expired verification token");
  }

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpiresAt = null;

  await user.save();

  if (!user.welcomeEmailSentAt) {
    try {
      await sendEmail({
        to: user.email,
        subject: "Welcome to Netflix AI Watch Spaces!",
        htmlContent: welcomeEmail({
          name: user.name,
        }),
      });

      user.welcomeEmailSentAt = new Date();
      await user.save();

      console.log(`Welcome email sent successfully to ${user.email}`);
    } catch (error) {
      console.error("Welcome email delivery failed:", error.message);
    }
  }

  return {
    success: true,
    message: "Email verified successfully",
  };
};

// ==========================================
// Password Reset OTP Helper
// ==========================================

const hashResetOtp = (otp) => {
  return createHash("sha256").update(otp).digest("hex");
};

// ==========================================
// Forgot Password - Send OTP
// ==========================================

export const forgotPassword = async (email) => {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({
    email: normalizedEmail,
  }).select("+password");

  const genericResponse = {
    success: true,
    message: "If the account exists, a password reset OTP has been sent.",
  };

  if (!user || !user.password) {
    return genericResponse;
  }

  const otp = randomInt(100000, 1000000).toString();

  user.passwordResetOtpHash = hashResetOtp(otp);

  user.passwordResetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  user.passwordResetOtpAttempts = 0;

  await user.save();

  try {
    await sendEmail({
      to: user.email,
      subject: "Your Password Reset OTP - Netflix AI Watch Spaces",
      htmlContent: passwordResetEmail({
        name: user.name,
        otp,
      }),
    });
  } catch (error) {
    user.passwordResetOtpHash = null;
    user.passwordResetOtpExpiresAt = null;
    user.passwordResetOtpAttempts = 0;

    await user.save();

    console.error("Password reset OTP email failed:", error.message);

    throw new Error("Unable to send password reset OTP");
  }

  return genericResponse;
};

// ==========================================
// Reset Password - Verify OTP
// ==========================================

export const resetPassword = async ({ email, otp, password }) => {
  if (!email || !otp || !password) {
    throw new Error("Email, OTP and new password are required");
  }

  const normalizedEmail = email.toLowerCase().trim();

  if (!/^\d{6}$/.test(otp)) {
    throw new Error("Enter a valid 6-digit OTP");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const user = await User.findOne({
    email: normalizedEmail,
  }).select(
    "+password +passwordResetOtpHash +passwordResetOtpExpiresAt +passwordResetOtpAttempts",
  );

  if (!user || !user.passwordResetOtpHash) {
    throw new Error("Invalid or expired OTP");
  }

  if (
    !user.passwordResetOtpExpiresAt ||
    user.passwordResetOtpExpiresAt <= new Date()
  ) {
    user.passwordResetOtpHash = null;
    user.passwordResetOtpExpiresAt = null;
    user.passwordResetOtpAttempts = 0;

    await user.save();

    throw new Error("OTP has expired. Please request a new OTP");
  }

  if (user.passwordResetOtpAttempts >= 5) {
    throw new Error("Maximum OTP attempts exceeded. Request a new OTP");
  }

  const submittedOtpHash = hashResetOtp(otp);

  if (submittedOtpHash !== user.passwordResetOtpHash) {
    user.passwordResetOtpAttempts += 1;

    const attemptsExceeded = user.passwordResetOtpAttempts >= 5;

    if (attemptsExceeded) {
      user.passwordResetOtpHash = null;
      user.passwordResetOtpExpiresAt = null;
      user.passwordResetOtpAttempts = 0;
    }

    await user.save();

    throw new Error(
      attemptsExceeded
        ? "Maximum OTP attempts exceeded. Request a new OTP"
        : "Incorrect OTP. Please try again",
    );
  }

  user.password = password;

  // Clear OTP after successful reset
  user.passwordResetOtpHash = null;
  user.passwordResetOtpExpiresAt = null;
  user.passwordResetOtpAttempts = 0;

  // Invalidate existing refresh session
  user.refreshTokenHash = null;
  user.refreshTokenExpiresAt = null;

  await user.save();

  return {
    success: true,
    message: "Password reset successfully. Please log in again.",
  };
};

// ==========================================
// Change Password
// ==========================================

export const changePassword = async ({
  userId,
  currentPassword,
  newPassword,
}) => {
  if (!currentPassword || !newPassword) {
    throw new Error("Current password and new password are required");
  }

  if (newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters");
  }

  if (currentPassword === newPassword) {
    throw new Error("New password must be different from current password");
  }

  const user = await User.findById(userId).select("+password");

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.password) {
    throw new Error("Password change is unavailable for this account");
  }

  const isPasswordValid = await user.comparePassword(currentPassword);

  if (!isPasswordValid) {
    throw new Error("Current password is incorrect");
  }

  user.password = newPassword;

  // Invalidate existing refresh session
  user.refreshTokenHash = null;
  user.refreshTokenExpiresAt = null;

  await user.save();

  return {
    success: true,
    message: "Password changed successfully. Please log in again.",
  };
};
