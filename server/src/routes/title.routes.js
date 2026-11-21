import express from "express";
import { param } from "express-validator";

import uploadVideo from "../middleware/video.middleware.js";
import uploadSubtitleFiles from "../middleware/subtitle.middleware.js";
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
  updateTitleSubtitleVariantsController,
  getTitleSubtitleController,
  createDraftTitleController,
  getDraftTitlesController,
  getDraftTitleByIdController,
  updateDraftTitleController,
  publishDraftTitleController,
} from "../controllers/title.controller.js";

const router = express.Router();

// Video and thumbnail upload error handling
const handleUpload = (fields) => {
  const upload = uploadVideo.fields(fields);

  return (req, res, next) => {
    upload(req, res, (error) => {
      if (!error) {
        return next();
      }

      if (error.status === 400 || error.name === "MulterError") {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      return next(error);
    });
  };
};

// Subtitle upload error handling
const handleSubtitleUpload = (req, res, next) => {
  uploadSubtitleFiles(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error.status === 400 || error.name === "MulterError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);
  });
};

// ==========================================
// Admin: Draft Title Management
// ==========================================

// Create draft
router.post(
  "/drafts",
  authenticate,
  authorizeRoles("admin"),
  handleUpload([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  createDraftTitleController,
);

// Get all drafts
router.get(
  "/drafts",
  authenticate,
  authorizeRoles("admin"),
  getDraftTitlesController,
);

// Get single draft
router.get(
  "/drafts/:titleId",
  authenticate,
  authorizeRoles("admin"),
  param("titleId").isMongoId().withMessage("Invalid title ID"),
  validate,
  getDraftTitleByIdController,
);

// Update draft
router.patch(
  "/drafts/:titleId",
  authenticate,
  authorizeRoles("admin"),
  handleUpload([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  param("titleId").isMongoId().withMessage("Invalid title ID"),
  validate,
  updateDraftTitleController,
);

// Publish draft
router.patch(
  "/drafts/:titleId/publish",
  authenticate,
  authorizeRoles("admin"),
  param("titleId").isMongoId().withMessage("Invalid title ID"),
  validate,
  publishDraftTitleController,
);

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
  handleUpload([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  createTitleController,
);

// Admin: Update title
router.patch(
  "/:titleId",
  authenticate,
  authorizeRoles("admin"),
  handleUpload([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  param("titleId").isMongoId().withMessage("Invalid title ID"),
  validate,
  updateTitleController,
);

// Admin: Update subtitle variants
router.put(
  "/:titleId/subtitle-variants",
  authenticate,
  authorizeRoles("admin"),
  param("titleId").isMongoId().withMessage("Invalid title ID"),
  validate,
  handleSubtitleUpload,
  updateTitleSubtitleVariantsController,
);

// Public: Get a subtitle variant
router.get(
  "/:titleId/subtitle-variants/:variantId",
  param("titleId").isMongoId().withMessage("Invalid title ID"),
  validate,
  getTitleSubtitleController,
);

// Public: Get title thumbnail
router.get(
  "/:titleId/thumbnail",
  param("titleId").isMongoId().withMessage("Invalid title ID"),
  validate,
  getTitleThumbnailController,
);

// Public: Stream title video
router.get(
  "/:titleId/video",
  param("titleId").isMongoId().withMessage("Invalid title ID"),
  validate,
  getTitleVideoController,
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
