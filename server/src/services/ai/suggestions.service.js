import { getTimelineEventsAtPlaybackPosition } from "./timeline.service.js";

const QUESTION_TYPES = [
  {
    eventType: "scene",
    type: "scene",
    label: "Explain this scene",
    description: "Understand the story moment",
    icon: "🎬",
    question: (event, content) => `Explain this scene: ${content}`,
  },
  {
    eventType: "characterAppearance",
    type: "character",
    label: "Explore this character",
    description: "Learn about a character in this moment",
    icon: "👤",
    question: (event, content) =>
      `What should I know about this character? ${content}`,
  },
  {
    eventType: "trivia",
    type: "trivia",
    label: "Interesting fact",
    description: "Discover a detail from the timeline",
    icon: "💡",
    question: (event, content) => `Explain this interesting fact: ${content}`,
  },
  {
    eventType: "glossary",
    type: "glossary",
    label: "Explain a term",
    description: "Understand a term introduced in the movie",
    icon: "📖",
    question: (event, content) => `Explain this term in the movie: ${content}`,
  },
  {
    eventType: "variationPoint",
    type: "poll",
    label: "Explore the group vote",
    description: "Understand the choices in this moment",
    icon: "🗳️",
    question: (event, content) => {
      const options = getPollOptions(event);

      return options.length
        ? `What are the choices in this group vote? ${content} Options: ${options.join(", ")}`
        : `Explain this group voting moment: ${content}`;
    },
  },
];

const getEventContent = (event) => {
  const value = event?.text ?? event?.description;

  return typeof value === "string" ? value.trim() : "";
};

const getPollOptions = (event) => {
  if (!Array.isArray(event?.options)) return [];

  return event.options
    .map((option) => {
      if (typeof option === "string") return option.trim();

      if (option && typeof option === "object") {
        const value =
          option.label ?? option.text ?? option.title ?? option.name;

        return typeof value === "string" ? value.trim() : "";
      }

      return "";
    })
    .filter(Boolean);
};

const getOrderedEvents = (events) =>
  [...events].sort(
    (first, second) =>
      Number(second.startTime || 0) - Number(first.startTime || 0),
  );

export const buildTimelineQuestions = (
  events = [],
  limit = Number.POSITIVE_INFINITY,
) => {
  if (!Array.isArray(events) || events.length === 0) return [];

  const orderedEvents = getOrderedEvents(events);

  // Build one question bucket for each supported timeline event type.
  const buckets = QUESTION_TYPES.map((definition) =>
    orderedEvents
      .filter((event) => {
        if (
          event?.eventType !== definition.eventType ||
          !getEventContent(event)
        ) {
          return false;
        }

        // A poll suggestion requires at least one usable option.
        if (definition.eventType === "variationPoint") {
          return getPollOptions(event).length > 0;
        }

        return true;
      })
      .map((event) => {
        const content = getEventContent(event);

        return {
          type: definition.type,
          label: definition.label,
          description: definition.description,
          icon: definition.icon,
          question: definition.question(event, content),
          eventId: event.eventId,
          startTime: event.startTime,
        };
      }),
  );

  // Interleave categories so the first batch has varied questions.
  const suggestions = [];
  const maximumBucketLength = Math.max(
    0,
    ...buckets.map((bucket) => bucket.length),
  );

  for (let index = 0; index < maximumBucketLength; index += 1) {
    for (const bucket of buckets) {
      if (bucket[index]) suggestions.push(bucket[index]);
    }
  }

  const safeLimit =
    Number.isInteger(limit) && limit >= 0 ? limit : suggestions.length;

  return suggestions.slice(0, safeLimit);
};

export const getWatchSpaceAISuggestions = async (
  watchSpaceId,
  { offset = 0, limit = 4 } = {},
) => {
  const context = await getTimelineEventsAtPlaybackPosition(watchSpaceId);

  const allSuggestions = buildTimelineQuestions(context.events);

  const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0;

  const safeLimit =
    Number.isInteger(limit) && limit > 0 ? Math.min(limit, 4) : 4;

  const suggestions = allSuggestions.slice(safeOffset, safeOffset + safeLimit);

  return {
    currentTime: context.currentTime,
    suggestions,
    totalSuggestions: allSuggestions.length,
    nextOffset:
      safeOffset + suggestions.length < allSuggestions.length
        ? safeOffset + suggestions.length
        : null,
    hasMore: safeOffset + suggestions.length < allSuggestions.length,
  };
};
