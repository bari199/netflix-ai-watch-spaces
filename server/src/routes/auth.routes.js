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
} from "../controllers/auth.controller.js";

import validate from "../middleware/validate.middleware.js";

const router = express.Router();

// Registration validation
const registerValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),

  body("email").trim().isEmail().withMessage("Enter a valid email address"),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
];

// Login validation
const loginValidation = [
  body("email").trim().isEmail().withMessage("Enter a valid email address"),

  body("password").notEmpty().withMessage("Password is required"),
];

// POST /api/auth/register
router.post("/register", registerValidation, validate, register);

// POST /api/auth/login
router.post("/login", loginValidation, validate, login);

// POST /api/auth/logout
router.post("/logout", logout);

// POST /api/auth/refresh
router.post("/refresh", refresh);

// GET /api/auth/verify-email
router.get("/verify-email", verifyEmailController);

// GET /api/auth/google
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  }),
);

// GET /api/auth/google/callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
  }),
  googleAuthCallback,
);

// GET /api/auth/facebook
router.get(
  "/facebook",
  passport.authenticate("facebook", {
    scope: ["email"],
    session: false,
  }),
);

// GET /api/auth/facebook/callback

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
