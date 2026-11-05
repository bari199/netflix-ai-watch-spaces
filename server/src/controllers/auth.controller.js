import {
  registerUser,
  verifyUserCredentials,
  refreshAccessToken,
  logoutUser,
  verifyEmail,
  createTokenPair,
} from "../services/auth.service.js";

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// Google OAuth callback

// Google OAuth callback
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

    return res.status(200).json({
      success: true,
      message: "Google login successful",
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    console.error("Google OAuth callback error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Google authentication failed",
    });
  }
};

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

    return res.status(200).json({
      success: true,
      message: "Facebook login successful",
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    console.error("Facebook OAuth callback error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Facebook authentication failed",
    });
  }
};

// Register

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const result = await registerUser({
      name,
      email,
      password,
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email.",
      emailVerificationRequired: true,
      user: result.user,
    });
  } catch (error) {
    const statusCode =
      error.message === "Email is already registered" ? 409 : 400;

    return res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

// Register controller for admin
// export const register = async (req, res) => {
//   try {
//     const { name, email, password } = req.body;

//     const result = await registerUser({
//       name,
//       email,
//       password,
//     });

//     return res.status(201).json({
//       success: true,
//       message: result.emailVerificationRequired
//         ? "Registration successful. Please verify your email."
//         : "Registration successful.",
//       emailVerificationRequired: result.emailVerificationRequired,
//       user: result.user,
//     });
//   } catch (error) {
//     const statusCode =
//       error.message === "Email is already registered" ? 409 : 400;

//     return res.status(statusCode).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
// Login
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

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

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
    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

export const refresh = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;

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

export const verifyEmailController = async (req, res) => {
  try {
    const { email, token } = req.query;

    const result = await verifyEmail({ email, token });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Send welcome email only when email verification is enabled
const emailVerificationEnabled =
  process.env.EMAIL_VERIFICATION_ENABLED !== "false";

if (emailVerificationEnabled && !user.welcomeEmailSentAt) {
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
