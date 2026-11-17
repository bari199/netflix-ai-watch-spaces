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
} from "../controllers/title.controller.js";

const router = express.Router();

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

      next(error);
    });
  };
};

const handleSubtitleUpload = (req, res, next) => {
  uploadSubtitleFiles(req, res, (error) => {
    if (!error) return next();

    if (error.status === 400 || error.name === "MulterError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);
  });
};

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

router.put(
  "/:titleId/subtitle-variants",
  authenticate,
  authorizeRoles("admin"),
  param("titleId").isMongoId().withMessage("Invalid title ID"),
  validate,
  handleSubtitleUpload,
  updateTitleSubtitleVariantsController,
);

router.get(
  "/:titleId/subtitle-variants/:variantId",
  param("titleId").isMongoId().withMessage("Invalid title ID"),
  validate,
  getTitleSubtitleController,
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
