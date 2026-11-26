import {
  createWatchSpace,
  getWatchSpaceById,
  getActiveWatchSpaces,
  joinWatchSpace,
  leaveWatchSpace,
  endWatchSpace,
  setParticipantMute,
  removeParticipant,
  setWatchSpaceLock,
  setPlaybackMode,
  deleteWatchSpace,
  transferWatchSpaceHost,
  getUpcomingScheduledWatchSpaces as getUpcomingScheduledWatchSpacesService,
  getMyActiveWatchSpaces as getMyActiveWatchSpacesService,
  getMyEndedWatchSpaces as getMyEndedWatchSpacesService,
  getMyHostedWatchSpaces as getMyHostedWatchSpacesService,
  getMyWatchSpaces as getMyWatchSpacesService,
} from "../services/watchSpace.service.js";

const handleWatchSpaceError = (res, error) => {
  console.error("WatchSpace API Error:", error.message);

  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (
    error.message === "WatchSpace not found" ||
    error.message === "Participant not found in this WatchSpace"
  ) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }

  const clientErrors = [
    "Invalid invite code",
    "This WatchSpace has already ended",
    "Host cannot leave the WatchSpace. End it instead.",
    "Only the host can end this WatchSpace",
    "You are not authorized to access this WatchSpace",
    "Only the host can mute or unmute participants",
    "Host cannot be muted",
    "Only the host can remove participants",
    "Host cannot remove themselves",
    "Only the host can lock or unlock this WatchSpace",
    "Only the current host can transfer ownership",
    "New host must be a participant of this WatchSpace",
    "User is already the host",
    "Current host participant record not found",
    "Only the host can delete this WatchSpace",
  ];

  if (error.message === "WatchSpace has reached its participant limit") {
    return res.status(409).json({
      success: false,
      message: error.message,
    });
  }

  if (clientErrors.includes(error.message)) {
    return res.status(403).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

// Create WatchSpace
export const createWatchSpaceController = async (req, res) => {
  try {
    const {
      titleId,
      isPrivate,
      maxParticipants,
      aiVerbosity,
      votingEnabled,
      triviaEnabled,
      scheduledAt,
    } = req.body;

    if (!titleId) {
      return res.status(400).json({
        success: false,
        message: "Title ID is required",
      });
    }

    let parsedScheduledAt = null;

    if (scheduledAt) {
      parsedScheduledAt = new Date(scheduledAt);

      if (
        Number.isNaN(parsedScheduledAt.getTime()) ||
        parsedScheduledAt <= new Date()
      ) {
        return res.status(400).json({
          success: false,
          message: "Scheduled date must be a valid future date",
        });
      }
    }

    const watchSpace = await createWatchSpace(
      titleId,
      req.user._id,
      isPrivate === true || isPrivate === "true",
      maxParticipants === undefined ? 50 : Number(maxParticipants),
      aiVerbosity || "normal",
      votingEnabled === undefined
        ? true
        : votingEnabled === true || votingEnabled === "true",
      triviaEnabled === undefined
        ? true
        : triviaEnabled === true || triviaEnabled === "true",
      parsedScheduledAt,
    );

    return res.status(201).json({
      success: true,
      message: "WatchSpace created successfully",
      watchSpace,
    });
  } catch (error) {
    return handleWatchSpaceError(res, error);
  }
};

// Get Active WatchSpaces
export const getActiveWatchSpacesController = async (req, res) => {
  try {
    const watchSpaces = await getActiveWatchSpaces();

    const safeWatchSpaces = watchSpaces.map((watchSpace) => {
      const watchSpaceData = watchSpace.toObject();

      watchSpaceData.inviteCode = null;

      return watchSpaceData;
    });

    return res.status(200).json({
      success: true,
      count: safeWatchSpaces.length,
      watchSpaces: safeWatchSpaces,
    });
  } catch (error) {
    return handleWatchSpaceError(res, error);
  }
};

// Get WatchSpace Details
export const getWatchSpaceByIdController = async (req, res) => {
  try {
    const watchSpace = await getWatchSpaceById(
      req.params.watchSpaceId,
      req.user._id,
    );

    const watchSpaceData = watchSpace.toObject();

    // Only the host can retrieve a private WatchSpace invite code.
    const isHost = watchSpace.host?._id?.toString() === req.user._id.toString();

    watchSpaceData.inviteCode =
      watchSpace.isPrivate && isHost ? watchSpace.inviteCode : null;

    return res.status(200).json({
      success: true,
      watchSpace: watchSpaceData,
    });
  } catch (error) {
    return handleWatchSpaceError(res, error);
  }
};

// Join WatchSpace
export const joinWatchSpaceController = async (req, res) => {
  try {
    const watchSpace = await joinWatchSpace(
      req.params.watchSpaceId,
      req.user._id,
      req.body?.inviteCode,
    );

    return res.status(200).json({
      success: true,
      message: "Joined WatchSpace successfully",
      watchSpace,
    });
  } catch (error) {
    return handleWatchSpaceError(res, error);
  }
};

// Leave WatchSpace
export const leaveWatchSpaceController = async (req, res) => {
  try {
    const watchSpace = await leaveWatchSpace(
      req.params.watchSpaceId,
      req.user._id,
    );

    return res.status(200).json({
      success: true,
      message: "Left WatchSpace successfully",
      watchSpace,
    });
  } catch (error) {
    return handleWatchSpaceError(res, error);
  }
};

// End WatchSpace
export const endWatchSpaceController = async (req, res) => {
  try {
    const watchSpace = await endWatchSpace(
      req.params.watchSpaceId,
      req.user._id,
    );

    return res.status(200).json({
      success: true,
      message: "WatchSpace ended successfully",
      watchSpace,
    });
  } catch (error) {
    return handleWatchSpaceError(res, error);
  }
};

// Delete WatchSpace (Current Host Only)
export const deleteWatchSpaceController = async (req, res) => {
  try {
    await deleteWatchSpace(req.params.watchSpaceId, req.user._id);

    return res.status(200).json({
      success: true,
      message: "WatchSpace deleted successfully",
    });
  } catch (error) {
    return handleWatchSpaceError(res, error);
  }
};

// Mute or Unmute Participant
export const setParticipantMuteController = async (req, res) => {
  try {
    const { participantId } = req.params;
    const { isMuted } = req.body;

    const watchSpace = await setParticipantMute(
      req.params.watchSpaceId,
      req.user._id,
      participantId,
      isMuted,
    );

    return res.status(200).json({
      success: true,
      message: isMuted
        ? "Participant muted successfully"
        : "Participant unmuted successfully",
      watchSpace,
    });
  } catch (error) {
    return handleWatchSpaceError(res, error);
  }
};

// Remove Participant
export const removeParticipantController = async (req, res) => {
  try {
    const watchSpace = await removeParticipant(
      req.params.watchSpaceId,
      req.user._id,
      req.params.participantId,
    );

    return res.status(200).json({
      success: true,
      message: "Participant removed successfully",
      watchSpace,
    });
  } catch (error) {
    return handleWatchSpaceError(res, error);
  }
};

// Host: switch between manual and timeline-driven playback.
export const setPlaybackModeController = async (req, res) => {
  try {
    const { mode } = req.body;
    const watchSpace = await setPlaybackMode(
      req.params.watchSpaceId,
      req.user._id,
      mode,
    );

    return res.status(200).json({
      success: true,
      message: `Playback mode changed to ${mode}`,
      watchSpace,
    });
  } catch (error) {
    return handleWatchSpaceError(res, error);
  }
};

// Lock or Unlock WatchSpace
export const setWatchSpaceLockController = async (req, res) => {
  try {
    const { isLocked } = req.body;

    const watchSpace = await setWatchSpaceLock(
      req.params.watchSpaceId,
      req.user._id,
      isLocked,
    );

    return res.status(200).json({
      success: true,
      message: isLocked
        ? "WatchSpace locked successfully"
        : "WatchSpace unlocked successfully",
      watchSpace,
    });
  } catch (error) {
    return handleWatchSpaceError(res, error);
  }
};

// Transfer WatchSpace Host
export const transferWatchSpaceHostController = async (req, res) => {
  try {
    const { newHostId } = req.body;

    const watchSpace = await transferWatchSpaceHost(
      req.params.watchSpaceId,
      req.user._id,
      newHostId,
    );

    return res.status(200).json({
      success: true,
      message: "WatchSpace host transferred successfully",
      watchSpace,
    });
  } catch (error) {
    return handleWatchSpaceError(res, error);
  }
};

// Get Upcoming Scheduled WatchSpaces

// Get Upcoming Scheduled WatchSpaces
export const getUpcomingScheduledWatchSpacesController = async (req, res) => {
  try {
    const limit = req.query.limit || 10;

    const watchSpaces = await getUpcomingScheduledWatchSpacesService(
      req.user._id,
      limit,
    );

    return res.status(200).json({
      success: true,
      count: watchSpaces.length,
      watchSpaces,
    });
  } catch (error) {
    return handleWatchSpaceError(res, error);
  }
};

// Get active WatchSpaces for the logged-in user
export const getMyActiveWatchSpacesController = async (req, res) => {
  try {
    const limit = req.query.limit || 10;

    const watchSpaces = await getMyActiveWatchSpacesService(
      req.user._id,
      limit,
    );

    return res.status(200).json({
      success: true,
      count: watchSpaces.length,
      watchSpaces,
    });
  } catch (error) {
    return handleWatchSpaceError(res, error);
  }
};

// Get ended WatchSpaces for the logged-in user
export const getMyEndedWatchSpacesController = async (req, res) => {
  try {
    const limit = req.query.limit || 10;

    const watchSpaces = await getMyEndedWatchSpacesService(req.user._id, limit);

    return res.status(200).json({
      success: true,
      count: watchSpaces.length,
      watchSpaces,
    });
  } catch (error) {
    return handleWatchSpaceError(res, error);
  }
};

// Get all WatchSpaces hosted by the logged-in user.
export const getMyHostedWatchSpacesController = async (req, res) => {
  try {
    const limit = req.query.limit || 20;

    const watchSpaces = await getMyHostedWatchSpacesService(
      req.user._id,
      limit,
    );

    return res.status(200).json({
      success: true,
      count: watchSpaces.length,
      watchSpaces,
    });
  } catch (error) {
    return handleWatchSpaceError(res, error);
  }
};

// Get all WatchSpaces hosted or joined by the logged-in user.
export const getMyWatchSpacesController = async (req, res) => {
  try {
    const limit = req.query.limit || 50;

    const watchSpaces = await getMyWatchSpacesService(req.user._id, limit);

    return res.status(200).json({
      success: true,
      count: watchSpaces.length,
      watchSpaces,
    });
  } catch (error) {
    return handleWatchSpaceError(res, error);
  }
};
