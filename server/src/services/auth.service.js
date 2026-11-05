import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { randomBytes, createHash } from "node:crypto";
import sendEmail from "../config/brevo.js";
import verificationEmail from "../utils/emailTemplates/verificationEmail.js";
import welcomeEmail from "../utils/emailTemplates/welcomeEmail.js";

const sanitizeUser = (user) => {
  const userData = user.toObject();

  delete userData.password;
  delete userData.refreshTokenHash;
  delete userData.refreshTokenExpiresAt;
  delete userData.emailVerificationTokenHash;
  delete userData.emailVerificationExpiresAt;

  return userData;
};

// Register new user

export const registerUser = async ({ name, email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({
    email: normalizedEmail,
  });

  if (existingUser) {
    throw new Error("Email is already registered");
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
  });

  await sendVerificationEmail(user);

  return {
    user: sanitizeUser(user),
    emailVerificationRequired: true,
  };
};


// Register new user for admin 
// export const registerUser = async ({ name, email, password }) => {
//   const normalizedEmail = email.toLowerCase().trim();

//   const existingUser = await User.findOne({
//     email: normalizedEmail,
//   });

//   if (existingUser) {
//     throw new Error("Email is already registered");
//   }

//   const emailVerificationEnabled =
//     process.env.EMAIL_VERIFICATION_ENABLED !== "false";

//   const user = await User.create({
//     name,
//     email: normalizedEmail,
//     password,
//     isEmailVerified: !emailVerificationEnabled,
//   });

//   if (emailVerificationEnabled) {
//     await sendVerificationEmail(user);
//   }

//   return {
//     user: sanitizeUser(user),
//     emailVerificationRequired: emailVerificationEnabled,
//   };
// };

// Verify login credentials
export const verifyUserCredentials = async ({ email, password }) => {
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

  return createTokenPair(user);
};

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

  // Store only the SHA-256 hash of the refresh token
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

  // Generate a new token pair and rotate the stored refresh token hash
  return createTokenPair(user);
};

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

export const sendVerificationEmail = async (user) => {
  const verificationToken = randomBytes(32).toString("hex");

  const tokenHash = createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  user.emailVerificationTokenHash = tokenHash;
  user.emailVerificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await user.save();

  const verificationUrl =
    `${process.env.API_BASE_URL}/api/auth/verify-email` +
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

  // Mark email as verified
  user.isEmailVerified = true;
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpiresAt = null;

  await user.save();

  // Send welcome email only once
  if (!user.welcomeEmailSentAt) {
    try {
      await sendEmail({
        to: user.email,
        subject: "Welcome to Netflix AI Watch Spaces!",
        htmlContent: welcomeEmail({
          name: user.name,
        }),
      });

      // Save timestamp only after successful email delivery
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
