import { randomUUID } from "node:crypto";
import WatchSpace from "../models/WatchSpace.js";
import { answerQuestion } from "../services/ai/copilot.service.js";

const getIdString = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value._id ?? value);
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
    const watchSpace = await WatchSpace.findById(req.params.watchSpaceId);

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

    return res.status(200).json({
      answer: result.answer,
      sourceEvents: result.sourceEvents,
      generatedAt: result.generatedAt,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "watchspace.ai_qa.controller_error",
        requestId,
        watchSpaceId,
        rejectionCategory: error?.aiRejectionCategory || "request_failed",
      }),
    );
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
