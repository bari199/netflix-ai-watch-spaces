import {
  registerUser,
  verifyUserCredentials,
  refreshAccessToken,
  logoutUser,
  verifyEmail,
  createTokenPair,
  sendWelcomeEmail,
  forgotPassword,
  resetPassword,
  changePassword,
} from "../services/auth.service.js";

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// ==========================================
// Google OAuth Callback
// ==========================================

export const googleAuthCallback = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Google authentication failed",
      });
    }

    const result = await createTokenPair(req.user);

    res.cookie("refreshToken", result.refreshToken, refreshCookieOptions);

    await sendWelcomeEmail(req.user);

    return res.redirect(process.env.CLIENT_URL || "http://localhost:5173");
  } catch (error) {
    console.error("Google OAuth callback error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Google authentication failed",
    });
  }
};

// ==========================================
// Facebook OAuth Callback
// ==========================================

export const facebookAuthCallback = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Facebook authentication failed",
      });
    }

    const result = await createTokenPair(req.user);

    res.cookie("refreshToken", result.refreshToken, refreshCookieOptions);

    await sendWelcomeEmail(req.user);

    return res.redirect(process.env.CLIENT_URL || "http://localhost:5173");
  } catch (error) {
    console.error("Facebook OAuth callback error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Facebook authentication failed",
    });
  }
};

// ==========================================
// Register
// ==========================================

export const register = async (req, res) => {
  try {
    console.log(
      "Registration avatar received:",
      req.file
        ? {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
          }
        : "NO AVATAR FILE",
    );

    const { name, email, password } = req.body;

    const result = await registerUser({
      name,
      email,
      password,
      avatarFile: req.file || null,
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email.",
      emailVerificationRequired: true,
      user: result.user,
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    const statusCode =
      error.message === "Email is already registered" ? 409 : 400;

    return res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Login
// ==========================================

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await verifyUserCredentials({
      email,
      password,
    });

    res.cookie("refreshToken", result.refreshToken, refreshCookieOptions);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Logout
// ==========================================

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    await logoutUser(refreshToken);

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth",
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

// ==========================================
// Refresh Access Token
// ==========================================

export const refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    const result = await refreshAccessToken(token);

    res.cookie("refreshToken", result.refreshToken, refreshCookieOptions);

    return res.status(200).json({
      success: true,
      message: "Access token refreshed successfully",
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Email Verification
// ==========================================

export const verifyEmailController = async (req, res) => {
  try {
    const { email, token } = req.query;

    const result = await verifyEmail({
      email,
      token,
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Forgot Password
// ==========================================

export const forgotPasswordController = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const result = await forgotPassword(email);

    return res.status(200).json(result);
  } catch (error) {
    console.error("Forgot password error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to process password reset request",
    });
  }
};

// ==========================================
// Reset Password
// ==========================================

export const resetPasswordController = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    const result = await resetPassword({
      email,
      otp,
      password,
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// Change Password
// ==========================================

export const changePasswordController = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const result = await changePassword({
      userId: req.user._id,
      currentPassword,
      newPassword,
    });

    return res.status(200).json(result);
  } catch (error) {
    const statusCode = error.message === "User not found" ? 404 : 400;

    return res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};
