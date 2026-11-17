import mongoose from "mongoose";
import { getTimelineEventsAtPlaybackPosition } from "./timeline.service.js";

const DEFAULT_RESULT_LIMIT = 5;

const STOP_WORDS = new Set([
  "a",
  "about",
  "after",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "before",
  "but",
  "by",
  "did",
  "do",
  "for",
  "from",
  "had",
  "has",
  "have",
  "he",
  "her",
  "him",
  "his",
  "i",
  "in",
  "is",
  "it",
  "its",
  "me",
  "of",
  "on",
  "or",
  "she",
  "that",
  "the",
  "their",
  "them",
  "there",
  "they",
  "this",
  "to",
  "was",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
  "you",
  "your",
]);

const FIELD_WEIGHTS = [
  ["canonicalContent", 3],
  ["transcript", 2],
  ["trivia", 2],
  ["eventType", 1.5],
  ["variationId", 1],
  ["options", 1],
];

export const getCanonicalTimelineContentField = (event) =>
  event?.text !== undefined && event?.text !== null ? "text" : "description";

export const getCanonicalTimelineContent = (event) => {
  const content = event?.[getCanonicalTimelineContentField(event)];

  return typeof content === "string" && content.trim() ? content : null;
};

const tokenize = (value) =>
  (
    String(value || "")
      .toLowerCase()
      .match(/[\p{L}\p{M}\p{N}]+/gu) || []
  ).filter((token) => !STOP_WORDS.has(token));

const getFieldText = (event, field) => {
  if (field === "canonicalContent") {
    return getCanonicalTimelineContent(event);
  }

  const value = event[field];

  if (Array.isArray(value)) {
    return value
      .map((item) =>
        item && typeof item === "object"
          ? `${item.id || ""} ${item.label || ""}`
          : item,
      )
      .join(" ");
  }

  return value;
};

const scoreEvent = (event, questionTokens) => {
  let score = 0;

  for (const token of questionTokens) {
    let tokenWeight = 0;

    for (const [field, weight] of FIELD_WEIGHTS) {
      if (tokenize(getFieldText(event, field)).includes(token)) {
        tokenWeight = Math.max(tokenWeight, weight);
      }
    }

    score += tokenWeight;
  }

  return score / questionTokens.length;
};

export const retrieveRelevantTimelineEvents = async (
  input,
  { diagnostics } = {},
) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Retrieval input is required");
  }

  const { watchSpaceId, question } = input;

  if (
    typeof watchSpaceId !== "string" ||
    !mongoose.isObjectIdOrHexString(watchSpaceId)
  ) {
    throw new Error("A valid WatchSpace ID is required");
  }

  if (typeof question !== "string" || !question.trim()) {
    throw new Error("A question is required");
  }

  const questionTokens = [...new Set(tokenize(question))];
  if (diagnostics) {
    diagnostics.watchSpaceId = watchSpaceId;
  }
  const timeline = await getTimelineEventsAtPlaybackPosition(watchSpaceId, {
    diagnostics,
  });

  const seenEventIds = new Set();

  for (const event of timeline.events) {
    if (seenEventIds.has(event.eventId)) {
      throw new Error("Timeline contains duplicate eventId values");
    }

    seenEventIds.add(event.eventId);
  }

  const anchorIndex = timeline.temporalAnchorIndex;
  const temporalCandidateCount =
    anchorIndex >= 0
      ? Math.min(anchorIndex + 1, 3)
      : 0;
  if (diagnostics) {
    diagnostics.temporalCandidateCount = temporalCandidateCount;
  }

  if (questionTokens.length === 0) {
    if (diagnostics) {
      diagnostics.retrievedCandidateCount = 0;
    }

    return {
      ...timeline,
      temporalCandidateCount,
      retrievedCandidateCount: 0,
      events: [],
    };
  }

  const scoredEvents = timeline.events
    .map((event, index) => ({
      event,
      index,
      relevanceScore: scoreEvent(event, questionTokens),
    }));

  const lexicalMatches = scoredEvents
    .filter(({ relevanceScore }) => relevanceScore > 0)
    .sort(
      (first, second) =>
        second.relevanceScore - first.relevanceScore ||
        second.event.startTime - first.event.startTime ||
        first.index - second.index,
    );

  const temporalCandidates =
    anchorIndex >= 0
      ? scoredEvents.slice(Math.max(0, anchorIndex - 2), anchorIndex + 1)
      : [];
  const selectedByEventId = new Map();

  for (const candidate of temporalCandidates) {
    selectedByEventId.set(candidate.event.eventId, candidate);
  }

  for (const match of lexicalMatches) {
    if (selectedByEventId.size >= DEFAULT_RESULT_LIMIT) {
      break;
    }

    if (!selectedByEventId.has(match.event.eventId)) {
      selectedByEventId.set(match.event.eventId, match);
    }
  }

  const events = [...selectedByEventId.values()]
    .sort((first, second) => {
      if (first.relevanceScore === 0 && second.relevanceScore === 0) {
        return first.index - second.index;
      }

      return (
        second.relevanceScore - first.relevanceScore ||
        second.event.startTime - first.event.startTime ||
        first.index - second.index
      );
    })
    .map(({ event, relevanceScore }) => ({ ...event, relevanceScore }));

  if (diagnostics) {
    diagnostics.retrievedCandidateCount = events.length;
  }

  return {
    ...timeline,
    temporalCandidateCount: temporalCandidates.length,
    retrievedCandidateCount: events.length,
    events,
  };
};