import test from "node:test";
import assert from "node:assert/strict";
import { buildTimelineQuestions } from "../src/services/ai/suggestions.service.js";

test("builds context-aware questions only from available timeline event types", () => {
  const suggestions = buildTimelineQuestions([
    {
      eventId: "scene-1",
      eventType: "scene",
      startTime: 10,
      text: "The team discovers a hidden signal.",
    },
    {
      eventId: "character-1",
      eventType: "characterAppearance",
      startTime: 12,
      text: "Mara enters the control room.",
    },
    {
      eventId: "trivia-1",
      eventType: "trivia",
      startTime: 8,
      text: "The signal repeats every seven minutes.",
    },
    {
      eventId: "glossary-1",
      eventType: "glossary",
      startTime: 7,
      text: "Quantum relay: a device that transmits across dimensions.",
    },
    {
      eventId: "future-event",
      eventType: "scene",
      startTime: 50,
      text: "A future event must not be supplied to this builder.",
    },
  ]);

  assert.equal(suggestions.length, 4);
  assert.deepEqual(
    suggestions.map(({ type }) => type),
    ["scene", "character", "trivia", "glossary"],
  );
  assert.equal(suggestions[0].eventId, "future-event");
  assert.match(suggestions[0].question, /A future event/);
  assert.equal(suggestions[1].eventId, "character-1");
});

test("returns no suggestions when the current timeline has no supported content", () => {
  assert.deepEqual(buildTimelineQuestions([]), []);
  assert.deepEqual(
    buildTimelineQuestions([
      { eventId: "variation-1", eventType: "variationPoint", text: "Audience poll" },
    ]),
    [],
  );
});

test("ignores supported event types without usable text", () => {
  assert.deepEqual(
    buildTimelineQuestions([
      { eventId: "empty-scene", eventType: "scene", text: "  " },
    ]),
    [],
  );
});
