import {
  createWatchSpace,
  getWatchSpaceById,
  getActiveWatchSpaces,
  joinWatchSpace,
  leaveWatchSpace,
  endWatchSpace,
} from "../services/watchSpace.service.js";

const handleWatchSpaceError = (res, error) => {
  console.error("WatchSpace API Error:", error.message);

  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (error.message === "WatchSpace not found") {
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
    const { titleId, isPrivate, maxParticipants } = req.body;

    if (!titleId) {
      return res.status(400).json({
        success: false,
        message: "Title ID is required",
      });
    }

    const watchSpace = await createWatchSpace(
      titleId,
      req.user._id,
      isPrivate === true || isPrivate === "true",
      maxParticipants === undefined ? 50 : Number(maxParticipants),
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
    watchSpaceData.inviteCode = null;

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
