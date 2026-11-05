import express from "express";
import { param, body } from "express-validator";

import authenticate from "../middleware/auth.middleware.js";
import authorizeRoles from "../middleware/role.middleware.js";
import validate from "../middleware/validate.middleware.js";

import {
  createWatchSpaceController,
  getActiveWatchSpacesController,
  getWatchSpaceByIdController,
  joinWatchSpaceController,
  leaveWatchSpaceController,
  endWatchSpaceController,
} from "../controllers/watchSpace.controller.js";

const router = express.Router();

// Public: Get active WatchSpaces
router.get("/", getActiveWatchSpacesController);

// Authenticated: Get WatchSpace details
router.get(
  "/:watchSpaceId",
  authenticate,
  param("watchSpaceId").isMongoId().withMessage("Invalid WatchSpace ID"),
  validate,
  getWatchSpaceByIdController,
);

// Host/Admin: Create WatchSpace
router.post(
  "/",
  authenticate,
  authorizeRoles("host", "admin"),
  body("titleId").isMongoId().withMessage("Invalid Title ID"),
  body("isPrivate").optional().isBoolean(),
  body("maxParticipants")
    .optional()
    .isInt({ min: 2, max: 50 })
    .withMessage("Max participants must be between 2 and 50"),
  validate,
  createWatchSpaceController,
);

// Authenticated: Join WatchSpace
router.post(
  "/:watchSpaceId/join",
  authenticate,
  param("watchSpaceId").isMongoId().withMessage("Invalid WatchSpace ID"),
  body("inviteCode").optional().isString(),
  validate,
  joinWatchSpaceController,
);

// Authenticated: Leave WatchSpace
router.post(
  "/:watchSpaceId/leave",
  authenticate,
  param("watchSpaceId").isMongoId().withMessage("Invalid WatchSpace ID"),
  validate,
  leaveWatchSpaceController,
);

// Host/Admin: End WatchSpace (service verifies actual host)
router.post(
  "/:watchSpaceId/end",
  authenticate,
  authorizeRoles("host", "admin"),
  param("watchSpaceId").isMongoId().withMessage("Invalid WatchSpace ID"),
  validate,
  endWatchSpaceController,
);

export default router;
