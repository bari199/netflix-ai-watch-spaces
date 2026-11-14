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
  getTitleThumbnailController,
  getTitleVideoController,
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
  uploadVideo.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  createTitleController,
);

// Admin: Update title
// Admin: Update title
router.patch(
  "/:titleId",
  authenticate,
  authorizeRoles("admin"),
  uploadVideo.fields([{ name: "thumbnail", maxCount: 1 }]),
  param("titleId").isMongoId().withMessage("Invalid title ID"),
  validate,
  updateTitleController,
);

// Get title thumbnail
router.get(
  "/:titleId/thumbnail",
  param("titleId").isMongoId().withMessage("Invalid title ID"),
  validate,
  getTitleThumbnailController,
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

router.get(
  "/:titleId/video",
  param("titleId").isMongoId().withMessage("Invalid title ID"),
  validate,
  getTitleVideoController,
);

export default router;
