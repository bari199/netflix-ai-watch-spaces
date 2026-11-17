export const TIMELINE_EVENT_TYPES = [
  "scene",
  "characterAppearance",
  "trivia",
  "glossary",
  "variationPoint",
];

export const getTimelineContentField = (event) =>
  event?.text !== undefined && event?.text !== null ? "text" : "description";

const isNonblankString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const toFiniteNumber = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim()) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  return null;
};

export const validateTimelineMetadata = (timeline, duration) => {
  if (!Array.isArray(timeline)) {
    return "Timeline metadata must be a list of events.";
  }

  if (timeline.length === 0) return "";

  const titleDuration = toFiniteNumber(duration);

  if (titleDuration === null || titleDuration <= 0) {
    return "Enter a valid title duration before adding timeline events.";
  }

  const eventIds = new Set();
  const variationIds = new Set();

  for (const [index, event] of timeline.entries()) {
    const eventLabel = `Timeline event ${index + 1}`;

    if (!event || typeof event !== "object" || Array.isArray(event)) {
      return `${eventLabel}: event data must be an object.`;
    }

    if (!TIMELINE_EVENT_TYPES.includes(event.eventType)) {
      return `${eventLabel}: select a supported event category.`;
    }

    if (!isNonblankString(event.eventId)) {
      return `${eventLabel}: event ID is required.`;
    }

    const eventId = event.eventId.trim();

    if (eventIds.has(eventId)) {
      return `${eventLabel}: event IDs must be unique.`;
    }

    eventIds.add(eventId);

    const startTime = toFiniteNumber(event.startTime);
    const endTime = toFiniteNumber(event.endTime);

    if (
      startTime === null ||
      endTime === null ||
      startTime < 0 ||
      endTime < 0
    ) {
      return `${eventLabel}: start and end times must be finite, nonnegative numbers.`;
    }

    if (endTime < startTime) {
      return `${eventLabel}: end time must be greater than or equal to start time.`;
    }

    if (endTime > titleDuration) {
      return `${eventLabel}: end time cannot exceed the title duration (${titleDuration} seconds).`;
    }

    const content = event[getTimelineContentField(event)];

    if (!isNonblankString(content)) {
      return `${eventLabel}: ${getTimelineContentField(event)} is required.`;
    }

    if (
      event.eventType === "characterAppearance" &&
      !isNonblankString(event.characterId)
    ) {
      return `${eventLabel}: character ID is required.`;
    }

    if (event.eventType === "variationPoint") {
      if (!isNonblankString(event.variationId)) {
        return `${eventLabel}: variation ID is required.`;
      }

      const variationId = event.variationId.trim();

      if (variationIds.has(variationId)) {
        return `${eventLabel}: variation IDs must be unique.`;
      }

      variationIds.add(variationId);

      if (!Array.isArray(event.options) || event.options.length < 2) {
        return `${eventLabel}: add at least two voting options.`;
      }

      const optionIds = new Set();

      for (const [optionIndex, option] of event.options.entries()) {
        if (
          !option ||
          typeof option !== "object" ||
          !isNonblankString(option.id)
        ) {
          return `${eventLabel}, option ${optionIndex + 1}: option ID is required.`;
        }

        if (!isNonblankString(option.label)) {
          return `${eventLabel}, option ${optionIndex + 1}: option label is required.`;
        }

        const optionId = option.id.trim();

        if (optionIds.has(optionId)) {
          return `${eventLabel}: option IDs must be unique within a variation point.`;
        }

        optionIds.add(optionId);
      }
    }
  }

  return "";
};

export const normalizeTimelineForSubmission = (timeline) => {
  if (!Array.isArray(timeline)) {
    throw new Error("Timeline metadata must be a list of events.");
  }

  return timeline.map((event) => {
    const normalizedEvent = {
      ...event,
      startTime: Number(event.startTime),
      endTime: Number(event.endTime),
    };

    if (event.eventType === "characterAppearance") {
      normalizedEvent.characterId = String(event.characterId || "").trim();

      if (event.characterName !== undefined && event.characterName !== null) {
        normalizedEvent.characterName = String(event.characterName).trim();
      }
    }

    if (event.eventType === "variationPoint") {
      normalizedEvent.variationId = String(event.variationId || "").trim();
      normalizedEvent.options = (event.options || []).map((option) => ({
        ...option,
        id: String(option.id || "").trim(),
        label: String(option.label || "").trim(),
      }));
    }

    return normalizedEvent;
  });
};

export const validateVariationTimeline = validateTimelineMetadata;
