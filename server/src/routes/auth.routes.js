import express from "express";
import { body } from "express-validator";
import passport from "../config/passport.js";

import {
  register,
  login,
  refresh,
  logout,
  verifyEmailController,
  googleAuthCallback,
  facebookAuthCallback,
  forgotPasswordController,
  resetPasswordController,
  changePasswordController,
} from "../controllers/auth.controller.js";

import uploadAvatar from "../middleware/avatar.middleware.js";
import authenticate from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.middleware.js";

const router = express.Router();

// ==========================================
// Validation Rules
// ==========================================

const registerValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),

  body("email").trim().isEmail().withMessage("Enter a valid email address"),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
];

const loginValidation = [
  body("email").trim().isEmail().withMessage("Enter a valid email address"),

  body("password").notEmpty().withMessage("Password is required"),
];

const forgotPasswordValidation = [
  body("email").trim().isEmail().withMessage("Enter a valid email address"),
];

const resetPasswordValidation = [
  body("email").trim().isEmail().withMessage("Enter a valid email address"),

  body("otp")
    .matches(/^\d{6}$/)
    .withMessage("OTP must be exactly 6 digits"),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
];

const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters"),
];

// ==========================================
// Registration
// ==========================================

router.post(
  "/register",
  uploadAvatar.single("avatar"),
  registerValidation,
  validate,
  register,
);

// ==========================================
// Login
// ==========================================

router.post("/login", loginValidation, validate, login);

// ==========================================
// Forgot Password
// ==========================================

router.post(
  "/forgot-password",
  forgotPasswordValidation,
  validate,
  forgotPasswordController,
);

// ==========================================
// Reset Password
// ==========================================

router.post(
  "/reset-password",
  resetPasswordValidation,
  validate,
  resetPasswordController,
);

// ==========================================
// Change Password (Protected)
// ==========================================

router.patch(
  "/change-password",
  authenticate,
  changePasswordValidation,
  validate,
  changePasswordController,
);

// ==========================================
// Logout
// ==========================================

router.post("/logout", logout);

// ==========================================
// Refresh Access Token
// ==========================================

router.post("/refresh", refresh);

// ==========================================
// Email Verification
// ==========================================

router.get("/verify-email", verifyEmailController);

// ==========================================
// Google OAuth
// ==========================================

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
  }),
  googleAuthCallback,
);

// ==========================================
// Facebook OAuth
// ==========================================

router.get(
  "/facebook",
  passport.authenticate("facebook", {
    scope: ["email"],
    session: false,
  }),
);

router.get("/facebook/callback", (req, res, next) => {
  passport.authenticate("facebook", { session: false }, (error, user, info) => {
    if (error) {
      console.error("Facebook OAuth error:", error.message);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    if (!user) {
      console.error("Facebook OAuth failed:", info?.message);

      return res.status(401).json({
        success: false,
        message: info?.message || "Facebook authentication failed",
      });
    }

    req.user = user;
    return facebookAuthCallback(req, res, next);
  })(req, res, next);
});

export default router;
