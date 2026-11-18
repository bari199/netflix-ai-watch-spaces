import mongoose from "mongoose";
import Interaction from "../models/Interaction.js";
import Title from "../models/Title.js";

const MAX_WATCHED_SECONDS_PER_SAVE = 30;
const COMPLETION_THRESHOLD_PERCENTAGE = 90;

// Persist playback progress atomically.
export const recordPlaybackProgress = async ({
  userId,
  titleId,
  watchSpaceId,
  watchedSeconds,
  positionSeconds,
}) => {
  if (
    !mongoose.isValidObjectId(userId) ||
    !mongoose.isValidObjectId(titleId) ||
    !mongoose.isValidObjectId(watchSpaceId)
  ) {
    throw new Error("Invalid interaction reference");
  }

  if (
    typeof watchedSeconds !== "number" ||
    !Number.isFinite(watchedSeconds) ||
    watchedSeconds <= 0 ||
    watchedSeconds > MAX_WATCHED_SECONDS_PER_SAVE
  ) {
    throw new Error("Invalid watched duration");
  }

  if (
    typeof positionSeconds !== "number" ||
    !Number.isFinite(positionSeconds) ||
    positionSeconds < 0
  ) {
    throw new Error("Invalid playback position");
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const titleObjectId = new mongoose.Types.ObjectId(titleId);
  const watchSpaceObjectId = new mongoose.Types.ObjectId(watchSpaceId);

  const title = await Title.findById(titleObjectId).select("duration");

  if (
    !title ||
    typeof title.duration !== "number" ||
    !Number.isFinite(title.duration) ||
    title.duration <= 0
  ) {
    throw new Error("Valid title duration not found");
  }

  const now = new Date();
  const safePosition = Math.min(positionSeconds, title.duration);

  // Calculate accumulated watch duration atomically.
  const nextWatchDuration = {
    $min: [
      title.duration,
      {
        $add: [{ $ifNull: ["$watchDurationSeconds", 0] }, watchedSeconds],
      },
    ],
  };

  const completionPercentage = {
    $multiply: [{ $divide: ["$watchDurationSeconds", title.duration] }, 100],
  };

  try {
    const interaction = await Interaction.findOneAndUpdate(
      {
        user: userObjectId,
        title: titleObjectId,
      },
      [
        {
          $set: {
            user: userObjectId,
            title: titleObjectId,
            watchSpace: watchSpaceObjectId,
            watchDurationSeconds: nextWatchDuration,
            lastPositionSeconds: safePosition,
            lastWatchedAt: now,
            createdAt: { $ifNull: ["$createdAt", now] },
            updatedAt: now,
          },
        },
        {
          $set: {
            completionPercentage,
            isCompleted: {
              $gte: [completionPercentage, COMPLETION_THRESHOLD_PERCENTAGE],
            },
          },
        },
      ],
      {
        upsert: true,
        returnDocument: "after",
        updatePipeline: true,
      },
    );

    if (!interaction) {
      throw new Error("Unable to save playback progress");
    }

    return interaction;
  } catch (error) {
    console.error("[INTERACTION SERVICE ERROR]", {
      message: error.message,
      stack: error.stack,
      userId: userId.toString(),
      titleId: titleId.toString(),
      watchSpaceId: watchSpaceId.toString(),
      watchedSeconds,
      positionSeconds,
    });

    throw error;
  }
};
// Get recently watched titles for the authenticated user.
export const getRecentlyWatched = async (userId, limit = 10) => {
  if (!mongoose.isValidObjectId(userId)) {
    throw new Error("Invalid user ID");
  }

  const safeLimit = Math.min(20, Math.max(1, Number(limit) || 10));

  const interactions = await Interaction.find({
    user: userId,
    lastWatchedAt: { $exists: true },
  })
    .populate({
      path: "title",
      select:
        "name description genre releaseYear duration thumbnailKey isPublished",
    })
    .sort({ lastWatchedAt: -1 })
    .limit(safeLimit)
    .lean();

  return interactions.filter((interaction) => interaction.title?.isPublished);
};
