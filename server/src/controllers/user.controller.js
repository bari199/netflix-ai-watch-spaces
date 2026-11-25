import {
  updateUserProfile,
  uploadUserAvatar,
  getUserAvatar,
} from "../services/user.service.js";

export const getCurrentUser = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "User profile retrieved successfully",
      user: req.user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve user profile",
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const user = await updateUserProfile(req.user._id, req.body);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    const statusCode = error.message === "User not found" ? 404 : 400;

    return res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

export const uploadAvatar = async (req, res) => {
  try {
    const user = await uploadUserAvatar(req.user._id, req.file);

    return res.status(200).json({
      success: true,
      message: "Avatar uploaded successfully",
      user,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const sendAvatar = async (req, res, userId) => {
  try {
    const avatar = await getUserAvatar(userId);
    res.setHeader("Content-Type", avatar.contentType);
    res.setHeader(
      "Cache-Control",
      "private, no-store, no-cache, must-revalidate, max-age=0",
    );
    res.setHeader("Vary", "Authorization");
    avatar.body.on("error", (error) => {
      console.error("Avatar stream failed:", error.message);
      if (!res.headersSent) res.status(503).end();
      else res.destroy(error);
    });
    avatar.body.pipe(res);
  } catch (error) {
    const missingAvatar =
      error?.message === "User not found" ||
      error?.message === "Avatar not found" ||
      error?.name === "CastError";

    console.error("Avatar retrieval failed:", error?.message || error);
    return res.status(missingAvatar ? 404 : 503).json({
      success: false,
      message: missingAvatar
        ? error.message
        : "Avatar storage is temporarily unavailable",
    });
  }
};

export const getAvatar = async (req, res) => sendAvatar(req, res, req.user._id);

export const getAvatarById = async (req, res) =>
  sendAvatar(req, res, req.params.userId);
