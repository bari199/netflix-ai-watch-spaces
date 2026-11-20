import mongoose from "mongoose";
import WatchSpace from "../models/WatchSpace.js";
import ChatMessage from "../models/ChatMessage.js";

export const getWatchSpaceAnalytics = async (watchSpaceId, userId) => {
  if (!mongoose.isValidObjectId(watchSpaceId)) {
    throw new Error("Invalid WatchSpace ID");
  }

  const watchSpace = await WatchSpace.findById(watchSpaceId).lean();

  if (!watchSpace) {
    throw new Error("WatchSpace not found");
  }

  const isHost = watchSpace.host.toString() === userId.toString();

  if (!isHost) {
    throw new Error("Only the WatchSpace host can access analytics");
  }

  const chatActivity = await ChatMessage.countDocuments({
    watchSpace: watchSpaceId,
  });

  const sessionDurationSeconds = watchSpace.startedAt
    ? Math.max(
        0,
        Math.floor(
          ((watchSpace.endedAt || new Date()) -
            new Date(watchSpace.startedAt)) /
            1000,
        ),
      )
    : 0;

  return {
    watchSpaceId: watchSpace._id,
    status: watchSpace.status,
    sessionDurationSeconds,
    peakParticipants: Math.max(
      watchSpace.peakParticipants || 0,
      watchSpace.participants?.length || 0,
    ),
    aiQuestionsAsked: watchSpace.aiQuestionsAsked ?? 0,
    triviaEventsSurfaced: (watchSpace.triggeredTriviaEventIds || []).length,
    chatActivity,
    startedAt: watchSpace.startedAt,
    endedAt: watchSpace.endedAt,
  };
};
