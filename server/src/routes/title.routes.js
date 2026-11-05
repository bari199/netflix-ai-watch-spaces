import express from "express";
import { param } from "express-validator";

import uploadVideo from "../middleware/video.middleware.js";
import authenticate from "../middleware/auth.middleware.js";
import authorizeRoles from "../middleware/role.middleware.js";
import validate from "../middleware/validate.middleware.js";

import {
  createTitleController,
  getPublishedTitlesController,
  getTitleByIdController,
  updateTitleController,
  deleteTitleController,
} from "../controllers/title.controller.js";

const router = express.Router();

// Public: Get all published titles
router.get("/", getPublishedTitlesController);

// Public: Get a published title by ID
router.get(
  "/:titleId",
  param("titleId").isMongoId().withMessage("Invalid title ID"),
  validate,
  getTitleByIdController,
);

// Admin: Create title with video upload
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  uploadVideo.single("video"),
  createTitleController,
);

// Admin: Update title
router.patch(
  "/:titleId",
  authenticate,
  authorizeRoles("admin"),
  param("titleId").isMongoId().withMessage("Invalid title ID"),
  validate,
  updateTitleController,
);

// Admin: Delete title
router.delete(
  "/:titleId",
  authenticate,
  authorizeRoles("admin"),
  param("titleId").isMongoId().withMessage("Invalid title ID"),
  validate,
  deleteTitleController,
);

export default router;
