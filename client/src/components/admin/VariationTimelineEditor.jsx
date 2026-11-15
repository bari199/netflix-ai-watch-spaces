import { useMemo } from "react";

const createId = (prefix) => {
  const value =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `${prefix}-${value}`;
};

const createVariationPoint = () => ({
  eventId: createId("event"),
  eventType: "variationPoint",
  startTime: 0,
  endTime: 30,
  description: "",
  variationId: createId("variation"),
  options: [
    { id: createId("option"), label: "Option A" },
    { id: createId("option"), label: "Option B" },
  ],
});

export const validateVariationTimeline = (timeline, duration) => {
  const points = (Array.isArray(timeline) ? timeline : []).filter(
    (event) => event?.eventType === "variationPoint",
  );

  if (points.length === 0) return "";

  const titleDuration = Number(duration);

  if (!Number.isFinite(titleDuration) || titleDuration <= 0) {
    return "Enter a valid title duration before adding variation points.";
  }

  const variationIds = points.map((point) =>
    String(point.variationId || "").trim(),
  );

  if (variationIds.some((id) => !id)) {
    return "Every variation point must have a Variation ID.";
  }

  if (new Set(variationIds).size !== variationIds.length) {
    return "Variation IDs must be unique. Please change the duplicate ID.";
  }

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const startTime = Number(point.startTime);
    const endTime = Number(point.endTime);
    const options = Array.isArray(point.options) ? point.options : [];

    if (
      point.startTime === "" ||
      point.endTime === "" ||
      !Number.isFinite(startTime) ||
      !Number.isFinite(endTime) ||
      startTime < 0 ||
      endTime < startTime
    ) {
      return `Variation Point ${index + 1}: enter valid start and end times. End time must be greater than or equal to start time.`;
    }

    if (endTime > titleDuration) {
      return `Variation Point ${index + 1}: end time cannot exceed the title duration (${titleDuration} seconds).`;
    }

    if (options.length < 2) {
      return `Variation Point ${index + 1}: add at least two voting options.`;
    }

    const optionIds = options.map((option) =>
      String(option.id || "").trim(),
    );
    const optionLabels = options.map((option) =>
      String(option.label || "").trim(),
    );

    if (optionIds.some((id) => !id)) {
      return `Variation Point ${index + 1}: an option is missing its ID.`;
    }

    if (new Set(optionIds).size !== optionIds.length) {
      return `Variation Point ${index + 1}: option IDs must be unique.`;
    }

    if (optionLabels.some((label) => !label)) {
      return `Variation Point ${index + 1}: every option needs a label.`;
    }
  }

  return "";
};

const VariationTimelineEditor = ({ timeline = [], onChange, duration }) => {
  const safeTimeline = Array.isArray(timeline) ? timeline : [];

  const variationPoints = useMemo(
    () =>
      safeTimeline
        .map((event, index) => ({ event, index }))
        .filter(({ event }) => event?.eventType === "variationPoint"),
    [safeTimeline],
  );

  const updateEvent = (eventIndex, updates) => {
    onChange(
      safeTimeline.map((event, index) =>
        index === eventIndex ? { ...event, ...updates } : event,
      ),
    );
  };

  const addVariationPoint = () => {
    onChange([...safeTimeline, createVariationPoint()]);
  };

  const removeVariationPoint = (eventIndex) => {
    if (
      !window.confirm(
        "Remove this variation point? Save the title to confirm this change.",
      )
    ) {
      return;
    }

    onChange(safeTimeline.filter((_, index) => index !== eventIndex));
  };

  const addOption = (eventIndex) => {
    const event = safeTimeline[eventIndex];
    updateEvent(eventIndex, {
      options: [
        ...(Array.isArray(event.options) ? event.options : []),
        { id: createId("option"), label: "" },
      ],
    });
  };

  const updateOption = (eventIndex, optionIndex, label) => {
    const event = safeTimeline[eventIndex];

    updateEvent(eventIndex, {
      options: (event.options || []).map((option, index) =>
        index === optionIndex ? { ...option, label } : option,
      ),
    });
  };

  const removeOption = (eventIndex, optionIndex) => {
    const event = safeTimeline[eventIndex];

    if ((event.options || []).length <= 2) return;

    updateEvent(eventIndex, {
      options: event.options.filter((_, index) => index !== optionIndex),
    });
  };

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-[#1f1f1f] px-3 py-2.5 text-sm text-white outline-none focus:border-red-500";

  return (
    <section className="space-y-4 border-t border-white/10 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Variation Points</h2>
          <p className="mt-1 text-sm text-gray-400">
            Configure moments where Watch Space members can vote.
          </p>
        </div>

        <button
          type="button"
          onClick={addVariationPoint}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold transition hover:bg-red-700"
        >
          + Add Variation Point
        </button>
      </div>

      {variationPoints.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/20 p-6 text-center">
          <p className="text-sm text-gray-400">
            No variation points have been added.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Add a variation point to create a voting moment in this title.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {variationPoints.map(({ event, index }, pointIndex) => (
            <article
              key={event.eventId || event.variationId || index}
              className="space-y-4 rounded-lg border border-white/10 bg-[#141414] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">
                  Variation Point {pointIndex + 1}
                </h3>
                <button
                  type="button"
                  onClick={() => removeVariationPoint(index)}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-gray-400">
                  Variation ID *
                </label>
                <input
                  type="text"
                  value={event.variationId || ""}
                  onChange={(e) =>
                    updateEvent(index, { variationId: e.target.value })
                  }
                  placeholder="e.g. ending-choice-01"
                  className={inputClass}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  This ID is used by the Watch Space voting socket.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium text-gray-400">
                    Start Time (seconds) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={event.startTime ?? ""}
                    onChange={(e) =>
                      updateEvent(index, { startTime: e.target.value })
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
                    value={event.endTime ?? ""}
                    onChange={(e) =>
                      updateEvent(index, { endTime: e.target.value })
                    }
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-gray-400">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={event.description || ""}
                  onChange={(e) =>
                    updateEvent(index, { description: e.target.value })
                  }
                  placeholder="Describe this voting moment..."
                  className={inputClass}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium">Voting Options *</label>
                  <button
                    type="button"
                    onClick={() => addOption(index)}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    + Add Option
                  </button>
                </div>

                {(event.options || []).map((option, optionIndex) => (
                  <div
                    key={option.id || optionIndex}
                    className="flex items-center gap-2"
                  >
                    <span className="w-6 shrink-0 text-xs text-gray-500">
                      {optionIndex + 1}.
                    </span>
                    <input
                      type="text"
                      value={option.label || ""}
                      onChange={(e) =>
                        updateOption(index, optionIndex, e.target.value)
                      }
                      placeholder={`Option ${optionIndex + 1}`}
                      aria-label={`Variation point ${pointIndex + 1}, option ${optionIndex + 1}`}
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
                ))}
                <p className="text-xs text-gray-500">
                  Minimum two options. Every option needs a label.
                </p>
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Times are measured in seconds from the beginning of the video. Other
        timeline event types are preserved.
        {duration ? ` Current title duration: ${duration} seconds.` : ""}
      </p>
    </section>
  );
};

export default VariationTimelineEditor;
