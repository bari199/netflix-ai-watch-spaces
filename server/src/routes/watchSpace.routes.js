import express from "express";
import { param, body } from "express-validator";

import authenticate from "../middleware/auth.middleware.js";
import authorizeRoles, {
  authorizeWatchSpaceHost,
} from "../middleware/role.middleware.js";
import validate from "../middleware/validate.middleware.js";

import {
  createWatchSpaceController,
  getActiveWatchSpacesController,
  getWatchSpaceByIdController,
  joinWatchSpaceController,
  leaveWatchSpaceController,
  endWatchSpaceController,
  setParticipantMuteController,
  removeParticipantController,
  setWatchSpaceLockController,
  transferWatchSpaceHostController,
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

  body("aiVerbosity")
    .optional()
    .isIn(["minimal", "normal", "chatty"])
    .withMessage("AI verbosity must be minimal, normal, or chatty"),

  body("votingEnabled")
    .optional()
    .isBoolean({ strict: true })
    .withMessage("Voting enabled must be a boolean"),

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

// Current WatchSpace Host/Admin: End WatchSpace
router.post(
  "/:watchSpaceId/end",
  authenticate,
  authorizeWatchSpaceHost,
  param("watchSpaceId").isMongoId().withMessage("Invalid WatchSpace ID"),
  validate,
  endWatchSpaceController,
);

// Current WatchSpace Host/Admin: Mute or Unmute Participant
router.patch(
  "/:watchSpaceId/participants/:participantId/mute",
  authenticate,
  authorizeWatchSpaceHost,

  param("watchSpaceId").isMongoId().withMessage("Invalid WatchSpace ID"),

  param("participantId").isMongoId().withMessage("Invalid Participant ID"),

  body("isMuted")
    .isBoolean({ strict: true })
    .withMessage("isMuted must be a boolean"),

  validate,
  setParticipantMuteController,
);

// Current WatchSpace Host/Admin: Remove Participant
router.delete(
  "/:watchSpaceId/participants/:participantId",
  authenticate,
  authorizeWatchSpaceHost,

  param("watchSpaceId").isMongoId().withMessage("Invalid WatchSpace ID"),

  param("participantId").isMongoId().withMessage("Invalid Participant ID"),

  validate,
  removeParticipantController,
);

// Current WatchSpace Host/Admin: Lock or Unlock WatchSpace
router.patch(
  "/:watchSpaceId/lock",
  authenticate,
  authorizeWatchSpaceHost,

  param("watchSpaceId").isMongoId().withMessage("Invalid WatchSpace ID"),

  body("isLocked")
    .isBoolean({ strict: true })
    .withMessage("isLocked must be a boolean"),

  validate,
  setWatchSpaceLockController,
);

// Current WatchSpace Host/Admin: Transfer WatchSpace Host
router.patch(
  "/:watchSpaceId/transfer-host",
  authenticate,
  authorizeWatchSpaceHost,

  param("watchSpaceId").isMongoId().withMessage("Invalid WatchSpace ID"),

  body("newHostId").isMongoId().withMessage("Invalid new Host ID"),

  validate,
  transferWatchSpaceHostController,
);

export default router;
