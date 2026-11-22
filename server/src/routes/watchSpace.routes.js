import express from "express";
import { param, body } from "express-validator";

import authenticate from "../middleware/auth.middleware.js";
import authorizeRoles, {
  authorizeWatchSpaceHost,
} from "../middleware/role.middleware.js";
import validate from "../middleware/validate.middleware.js";

import { askWatchSpaceAIController } from "../controllers/ai.controller.js";

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
  setPlaybackModeController,
  transferWatchSpaceHostController,
  getUpcomingScheduledWatchSpacesController,
  getMyActiveWatchSpacesController,
  getMyEndedWatchSpacesController,
  getMyHostedWatchSpacesController,
  deleteWatchSpaceController,
} from "../controllers/watchSpace.controller.js";

const router = express.Router();

// Only Viewer and Host accounts can access WatchSpace APIs.
const allowWatchSpaceUsers = authorizeRoles("viewer", "host");

// ==========================================
// Public: Get Active WatchSpaces
// ==========================================

router.get("/", getActiveWatchSpacesController);

// ==========================================
// Get Upcoming Scheduled WatchSpaces
// ==========================================

router.get(
  "/upcoming",
  authenticate,
  allowWatchSpaceUsers,
  getUpcomingScheduledWatchSpacesController,
);

// ==========================================
// Get My Active WatchSpaces
// ==========================================

router.get(
  "/my-active",
  authenticate,
  allowWatchSpaceUsers,
  getMyActiveWatchSpacesController,
);

// ==========================================
// Get My Ended WatchSpaces
// ==========================================

router.get(
  "/my-ended",
  authenticate,
  allowWatchSpaceUsers,
  getMyEndedWatchSpacesController,
);

// Get all WatchSpaces hosted by the logged-in user
router.get(
  "/my-hosted",
  authenticate,
  allowWatchSpaceUsers,
  getMyHostedWatchSpacesController,
);

// ==========================================
// Get WatchSpace Details
// ==========================================

router.get(
  "/:watchSpaceId",
  authenticate,
  allowWatchSpaceUsers,
  param("watchSpaceId").isMongoId().withMessage("Invalid WatchSpace ID"),
  validate,
  getWatchSpaceByIdController,
);

// ==========================================
// Ask AI Co-pilot
// ==========================================

router.post(
  "/:watchSpaceId/ai/ask",
  authenticate,
  allowWatchSpaceUsers,
  param("watchSpaceId").isMongoId().withMessage("Invalid WatchSpace ID"),
  body("question")
    .isString()
    .withMessage("Question must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("A question is required"),
  validate,
  askWatchSpaceAIController,
);

// ==========================================
// Create WatchSpace
// Creator automatically becomes Host.
// ==========================================

router.post(
  "/",
  authenticate,
  allowWatchSpaceUsers,

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

  body("triviaEnabled")
    .optional()
    .isBoolean({ strict: true })
    .withMessage("Trivia enabled must be a boolean"),

  validate,
  createWatchSpaceController,
);

// ==========================================
// Join WatchSpace
// ==========================================

router.post(
  "/:watchSpaceId/join",
  authenticate,
  allowWatchSpaceUsers,
  param("watchSpaceId").isMongoId().withMessage("Invalid WatchSpace ID"),
  body("inviteCode").optional().isString(),
  validate,
  joinWatchSpaceController,
);

// ==========================================
// Leave WatchSpace
// ==========================================

router.post(
  "/:watchSpaceId/leave",
  authenticate,
  allowWatchSpaceUsers,
  param("watchSpaceId").isMongoId().withMessage("Invalid WatchSpace ID"),
  validate,
  leaveWatchSpaceController,
);

// ==========================================
// End WatchSpace (Current Host Only)
// ==========================================

router.post(
  "/:watchSpaceId/end",
  authenticate,
  allowWatchSpaceUsers,
  authorizeWatchSpaceHost,
  param("watchSpaceId").isMongoId().withMessage("Invalid WatchSpace ID"),
  validate,
  endWatchSpaceController,
);

// ==========================================
// Delete WatchSpace (Current Host Only)
// ==========================================
router.delete(
  "/:watchSpaceId",
  authenticate,
  allowWatchSpaceUsers,
  authorizeWatchSpaceHost,
  param("watchSpaceId").isMongoId().withMessage("Invalid WatchSpace ID"),
  validate,
  deleteWatchSpaceController,
);

// ==========================================
// Mute or Unmute Participant
// ==========================================

router.patch(
  "/:watchSpaceId/participants/:participantId/mute",
  authenticate,
  allowWatchSpaceUsers,
  authorizeWatchSpaceHost,

  param("watchSpaceId").isMongoId().withMessage("Invalid WatchSpace ID"),

  param("participantId").isMongoId().withMessage("Invalid Participant ID"),

  body("isMuted")
    .isBoolean({ strict: true })
    .withMessage("isMuted must be a boolean"),

  validate,
  setParticipantMuteController,
);

// ==========================================
// Remove Participant
// ==========================================

router.delete(
  "/:watchSpaceId/participants/:participantId",
  authenticate,
  allowWatchSpaceUsers,
  authorizeWatchSpaceHost,

  param("watchSpaceId").isMongoId().withMessage("Invalid WatchSpace ID"),

  param("participantId").isMongoId().withMessage("Invalid Participant ID"),

  validate,
  removeParticipantController,
);

// ==========================================
// Lock or Unlock WatchSpace
// ==========================================

router.patch(
  "/:watchSpaceId/lock",
  authenticate,
  allowWatchSpaceUsers,
  authorizeWatchSpaceHost,

  param("watchSpaceId").isMongoId().withMessage("Invalid WatchSpace ID"),

  body("isLocked")
    .isBoolean({ strict: true })
    .withMessage("isLocked must be a boolean"),

  validate,
  setWatchSpaceLockController,
);

// ==========================================
// Change playback mode (Current Host Only)
// ==========================================

router.patch(
  "/:watchSpaceId/playback-mode",
  authenticate,
  allowWatchSpaceUsers,
  authorizeWatchSpaceHost,
  param("watchSpaceId").isMongoId().withMessage("Invalid WatchSpace ID"),
  body("mode")
    .isIn(["manual", "automatic"])
    .withMessage("Playback mode must be manual or automatic"),
  validate,
  setPlaybackModeController,
);

// ==========================================
// Transfer WatchSpace Host
// ==========================================

router.patch(
  "/:watchSpaceId/transfer-host",
  authenticate,
  allowWatchSpaceUsers,
  authorizeWatchSpaceHost,

  param("watchSpaceId").isMongoId().withMessage("Invalid WatchSpace ID"),

  body("newHostId").isMongoId().withMessage("Invalid new Host ID"),

  validate,
  transferWatchSpaceHostController,
);

export default router;
