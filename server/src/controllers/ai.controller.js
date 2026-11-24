import { randomUUID } from "node:crypto";
import WatchSpace from "../models/WatchSpace.js";
import { answerQuestion } from "../services/ai/copilot.service.js";
import { getWatchSpaceAISuggestions } from "../services/ai/suggestions.service.js";

const getIdString = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value?._id ?? value);
};

export const askWatchSpaceAIController = async (req, res) => {
  const requestId = randomUUID();
  const watchSpaceId = req.params.watchSpaceId;
  const question = req.body?.question;

  if (typeof question !== "string" || !question.trim()) {
    return res.status(400).json({
      success: false,
      message: "A question is required",
    });
  }

  try {
    const watchSpace = await WatchSpace.findById(watchSpaceId);

    if (!watchSpace) {
      return res.status(404).json({
        success: false,
        message: "WatchSpace not found",
      });
    }

    const userId = getIdString(req.user?._id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const isHost = getIdString(watchSpace.host) === userId;

    const isParticipant = watchSpace.participants.some(
      (participant) => getIdString(participant.user) === userId,
    );

    if (!isHost && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to ask questions in this WatchSpace",
      });
    }

    const result = await answerQuestion({
      question: question.trim(),
      watchSpaceId,
      requestId,
    });

    await WatchSpace.updateOne(
      { _id: watchSpaceId },
      { $inc: { aiQuestionsAsked: 1 } },
    );

    return res.status(200).json({
      answer: result.answer,
      answerMode: result.answerMode,
      sourceEvents: result.sourceEvents,
      followUpQuestions: result.followUpQuestions || [],
      generatedAt: result.generatedAt,
    });
  } catch (error) {
    console.error("[WatchSpace AI Q&A Controller Error]", {
      requestId,
      watchSpaceId,
      rejectionCategory: error?.aiRejectionCategory || "request_failed",
      message: error?.message,
      stack: error?.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getWatchSpaceAISuggestionsController = async (req, res) => {
  const watchSpaceId = req.params.watchSpaceId;

  try {
    const watchSpace = await WatchSpace.findById(watchSpaceId);

    if (!watchSpace) {
      return res.status(404).json({
        success: false,
        message: "WatchSpace not found",
      });
    }

    const userId = getIdString(req.user?._id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const isHost = getIdString(watchSpace.host) === userId;

    const isParticipant = watchSpace.participants.some(
      (participant) => getIdString(participant.user) === userId,
    );

    if (!isHost && !isParticipant) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to view AI suggestions in this WatchSpace",
      });
    }

    const offset = Number(req.query.offset ?? 0);
    const limit = Number(req.query.limit ?? 4);

    const result = await getWatchSpaceAISuggestions(watchSpaceId, {
      offset,
      limit,
    });

    return res.status(200).json({
      currentTime: result.currentTime,
      suggestions: result.suggestions,
      totalSuggestions: result.totalSuggestions,
      nextOffset: result.nextOffset,
      hasMore: result.hasMore,
    });
  } catch (error) {
    console.error("[WatchSpace AI Suggestions Error]", error?.message || error);

    return res.status(500).json({
      success: false,
      message: "Unable to load AI suggestions",
    });
  }
};
