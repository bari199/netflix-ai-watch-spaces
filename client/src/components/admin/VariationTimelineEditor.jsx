import { useState } from "react";
import {
  getTimelineContentField,
  TIMELINE_EVENT_TYPES,
} from "../../utils/timelineMetadata.js";

const EVENT_TYPE_LABELS = {
  scene: "Scene",
  characterAppearance: "Character Appearance",
  trivia: "Trivia",
  glossary: "Glossary",
  variationPoint: "Variation Point",
};

const createId = (prefix) => {
  const value =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `${prefix}-${value}`;
};

const createTimelineEvent = (eventType, duration) => {
  const parsedDuration = Number(duration);
  const event = {
    eventId: createId("event"),
    eventType,
    startTime: 0,
    endTime:
      Number.isFinite(parsedDuration) && parsedDuration > 0
        ? Math.min(30, parsedDuration)
        : 30,
    text: "",
  };

  if (eventType === "characterAppearance") {
    return { ...event, characterId: "", characterName: "" };
  }

  if (eventType === "variationPoint") {
    return {
      ...event,
      variationId: createId("variation"),
      options: [
        { id: createId("option"), label: "Option A" },
        { id: createId("option"), label: "Option B" },
      ],
    };
  }

  return event;
};

const VariationTimelineEditor = ({ timeline = [], onChange, duration }) => {
  const safeTimeline = Array.isArray(timeline) ? timeline : [];
  const [newEventType, setNewEventType] = useState("scene");

  const updateEvent = (eventIndex, updates) => {
    onChange(
      safeTimeline.map((event, index) =>
        index === eventIndex ? { ...(event || {}), ...updates } : event,
      ),
    );
  };

  const addEvent = () => {
    onChange([...safeTimeline, createTimelineEvent(newEventType, duration)]);
  };

  const removeEvent = (eventIndex, eventType) => {
    const label =
      eventType === "variationPoint" ? "variation point" : "timeline event";

    if (
      !window.confirm(
        `Remove this ${label}? Save the title to confirm this change.`,
      )
    ) {
      return;
    }

    onChange(safeTimeline.filter((_, index) => index !== eventIndex));
  };

  const addOption = (eventIndex) => {
    const event = safeTimeline[eventIndex] || {};

    updateEvent(eventIndex, {
      options: [
        ...(Array.isArray(event.options) ? event.options : []),
        { id: createId("option"), label: "" },
      ],
    });
  };

  const updateOption = (eventIndex, optionIndex, field, value) => {
    const event = safeTimeline[eventIndex] || {};

    updateEvent(eventIndex, {
      options: (Array.isArray(event.options) ? event.options : []).map(
        (option, index) =>
          index === optionIndex ? { ...(option || {}), [field]: value } : option,
      ),
    });
  };

  const removeOption = (eventIndex, optionIndex) => {
    const event = safeTimeline[eventIndex] || {};
    const options = Array.isArray(event.options) ? event.options : [];

    if (options.length <= 2) return;

    updateEvent(eventIndex, {
      options: options.filter((_, index) => index !== optionIndex),
    });
  };

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-[#1f1f1f] px-3 py-2.5 text-sm text-white outline-none focus:border-red-500";

  return (
    <section className="space-y-4 border-t border-white/10 pt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Timeline Metadata</h2>
          <p className="mt-1 text-sm text-gray-400">
            Add timestamped scenes, character appearances, trivia, glossary
            entries, and variation points.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label
              htmlFor="new-timeline-event-type"
              className="mb-1 block text-xs font-medium text-gray-400"
            >
              Event Category
            </label>
            <select
              id="new-timeline-event-type"
              value={newEventType}
              onChange={(event) => setNewEventType(event.target.value)}
              className={inputClass}
            >
              {TIMELINE_EVENT_TYPES.map((eventType) => (
                <option key={eventType} value={eventType}>
                  {EVENT_TYPE_LABELS[eventType]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={addEvent}
            className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-red-700"
          >
            + Add Event
          </button>
        </div>
      </div>

      {safeTimeline.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/20 p-6 text-center">
          <p className="text-sm text-gray-400">No timeline events have been added.</p>
          <p className="mt-1 text-xs text-gray-500">
            Choose a category and add the first event.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {safeTimeline.map((rawEvent, index) => {
            const event =
              rawEvent && typeof rawEvent === "object" ? rawEvent : {};
            const contentField = getTimelineContentField(event);
            const eventTypeIsSupported = TIMELINE_EVENT_TYPES.includes(
              event.eventType,
            );

            return (
              <article
                key={event.eventId || index}
                className="space-y-4 rounded-lg border border-white/10 bg-[#141414] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">
                    Timeline Event {index + 1}
                  </h3>
                  <button
                    type="button"
                    onClick={() => removeEvent(index, event.eventType)}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-medium text-gray-400">
                      Event ID *
                    </label>
                    <input
                      type="text"
                      value={event.eventId || ""}
                      onChange={(inputEvent) =>
                        updateEvent(index, { eventId: inputEvent.target.value })
                      }
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-gray-400">
                      Event Category *
                    </label>
                    <select
                      value={event.eventType || ""}
                      onChange={(inputEvent) =>
                        updateEvent(index, {
                          eventType: inputEvent.target.value,
                        })
                      }
                      className={inputClass}
                      required
                    >
                      {!eventTypeIsSupported && (
                        <option value={event.eventType || ""}>
                          Unsupported category: {event.eventType || "missing"}
                        </option>
                      )}
                      {TIMELINE_EVENT_TYPES.map((eventType) => (
                        <option key={eventType} value={eventType}>
                          {EVENT_TYPE_LABELS[eventType]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-medium text-gray-400">
                      Start Time (seconds) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={event.startTime ?? ""}
                      onChange={(inputEvent) =>
                        updateEvent(index, {
                          startTime: inputEvent.target.value,
                        })
                      }
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-medium text-gray-400">
                      End Time (seconds) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={event.endTime ?? ""}
                      onChange={(inputEvent) =>
                        updateEvent(index, {
                          endTime: inputEvent.target.value,
                        })
                      }
                      className={inputClass}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-gray-400">
                    {contentField === "text"
                      ? "Text *"
                      : "Description (legacy content) *"}
                  </label>
                  <textarea
                    rows={3}
                    value={event[contentField] ?? ""}
                    onChange={(inputEvent) =>
                      updateEvent(index, {
                        [contentField]: inputEvent.target.value,
                      })
                    }
                    placeholder="Enter the timeline content..."
                    className={inputClass}
                    required
                  />
                </div>

                {event.eventType === "characterAppearance" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-medium text-gray-400">
                        Character ID *
                      </label>
                      <input
                        type="text"
                        value={event.characterId || ""}
                        onChange={(inputEvent) =>
                          updateEvent(index, {
                            characterId: inputEvent.target.value,
                          })
                        }
                        placeholder="Stable character reference"
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-medium text-gray-400">
                        Character Name (optional)
                      </label>
                      <input
                        type="text"
                        value={event.characterName || ""}
                        onChange={(inputEvent) =>
                          updateEvent(index, {
                            characterName: inputEvent.target.value,
                          })
                        }
                        placeholder="Display name"
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}

                {event.eventType === "variationPoint" && (
                  <>
                    <div>
                      <label className="mb-2 block text-xs font-medium text-gray-400">
                        Variation ID *
                      </label>
                      <input
                        type="text"
                        value={event.variationId || ""}
                        onChange={(inputEvent) =>
                          updateEvent(index, {
                            variationId: inputEvent.target.value,
                          })
                        }
                        placeholder="e.g. ending-choice-01"
                        className={inputClass}
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        This ID is used by the Watch Space voting socket.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-sm font-medium">
                          Voting Options *
                        </label>
                        <button
                          type="button"
                          onClick={() => addOption(index)}
                          className="text-sm text-red-400 hover:text-red-300"
                        >
                          + Add Option
                        </button>
                      </div>

                      {(Array.isArray(event.options) ? event.options : []).map(
                        (option, optionIndex) => (
                          <div
                            key={option?.id || optionIndex}
                            className="grid items-center gap-2 sm:grid-cols-[1fr_2fr_auto]"
                          >
                            <span className="text-xs text-gray-500 sm:hidden">
                              Option {optionIndex + 1}
                            </span>
                            <input
                              type="text"
                              value={option?.id || ""}
                              onChange={(inputEvent) =>
                                updateOption(
                                  index,
                                  optionIndex,
                                  "id",
                                  inputEvent.target.value,
                                )
                              }
                              placeholder="Option ID"
                              aria-label={`Variation point ${index + 1}, option ${optionIndex + 1} ID`}
                              className={inputClass}
                            />
                            <input
                              type="text"
                              value={option?.label || ""}
                              onChange={(inputEvent) =>
                                updateOption(
                                  index,
                                  optionIndex,
                                  "label",
                                  inputEvent.target.value,
                                )
                              }
                              placeholder={`Option ${optionIndex + 1} label`}
                              aria-label={`Variation point ${index + 1}, option ${optionIndex + 1} label`}
                              className={inputClass}
                            />
                            <button
                              type="button"
                              onClick={() => removeOption(index, optionIndex)}
                              disabled={(event.options || []).length <= 2}
                              title="At least two options are required"
                              className="shrink-0 rounded-lg border border-white/10 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              ✕
                            </button>
                          </div>
                        ),
                      )}
                      <p className="text-xs text-gray-500">
                        Minimum two options. Every option needs a unique ID and
                        a label.
                      </p>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Times are measured in seconds from the beginning of the video. Events
        use startTime and endTime. Other metadata fields are preserved.
        {duration ? ` Current title duration: ${duration} seconds.` : ""}
      </p>
    </section>
  );
};

export default VariationTimelineEditor;
