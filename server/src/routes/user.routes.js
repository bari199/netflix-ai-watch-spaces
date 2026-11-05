import express from "express";
import authenticate from "../middleware/auth.middleware.js";
import uploadAvatarFile from "../middleware/avatar.middleware.js";

import {
  getCurrentUser,
  updateProfile,
  uploadAvatar,
  getAvatar,
} from "../controllers/user.controller.js";

const router = express.Router();

router.get("/me", authenticate, getCurrentUser);

router.patch("/me", authenticate, updateProfile);

router.patch(
  "/me/avatar",
  authenticate,
  uploadAvatarFile.single("avatar"),
  uploadAvatar,
);

router.get("/me/avatar", authenticate, getAvatar);

export default router;
