import { getTimelineEventsAtPlaybackPosition } from "./timeline.service.js";

const QUESTION_TYPES = [
  {
    eventType: "scene",
    type: "scene",
    label: "Explain this scene",
    description: "Understand the story moment",
    icon: "🎬",
    question: (event) => `Explain this scene: ${event.text || event.description}`,
  },
  {
    eventType: "characterAppearance",
    type: "character",
    label: "Explore this character",
    description: "Learn about a character in this moment",
    icon: "👤",
    question: (event) => `What should I know about this character? ${event.text || event.description}`,
  },
  {
    eventType: "trivia",
    type: "trivia",
    label: "Interesting fact",
    description: "Discover a detail from the timeline",
    icon: "💡",
    question: (event) => `Explain this interesting fact: ${event.text || event.description}`,
  },
  {
    eventType: "glossary",
    type: "glossary",
    label: "Explain a term",
    description: "Understand a term introduced in the movie",
    icon: "📖",
    question: (event) => `Explain this term in the movie: ${event.text || event.description}`,
  },
];

const getEventContent = (event) => {
  const value = event?.text ?? event?.description;
  return typeof value === "string" ? value.trim() : "";
};

export const buildTimelineQuestions = (events = [], limit = 4) => {
  if (!Array.isArray(events) || events.length === 0) return [];

  const orderedEvents = [...events].sort(
    (first, second) =>
      Number(second.startTime || 0) - Number(first.startTime || 0),
  );

  return QUESTION_TYPES
    .map((definition) => {
      const event = orderedEvents.find(
        (item) =>
          item?.eventType === definition.eventType && getEventContent(item),
      );

      if (!event) return null;

      return {
        type: definition.type,
        label: definition.label,
        description: definition.description,
        icon: definition.icon,
        question: definition.question(event),
        eventId: event.eventId,
        startTime: event.startTime,
      };
    })
    .filter(Boolean)
    .slice(0, limit);
};

export const getWatchSpaceAISuggestions = async (watchSpaceId) => {
  const context = await getTimelineEventsAtPlaybackPosition(watchSpaceId);
  return {
    currentTime: context.currentTime,
    suggestions: buildTimelineQuestions(context.events),
  };
};
