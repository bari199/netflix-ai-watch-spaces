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

export const getAvatar = async (req, res) => {
  try {
    const avatar = await getUserAvatar(req.user._id);

    res.setHeader("Content-Type", avatar.contentType);
    res.setHeader("Cache-Control", "private, max-age=3600");

    avatar.body.pipe(res);
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};
