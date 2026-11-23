import test from "node:test";
import assert from "node:assert/strict";
import { buildTimelineQuestions } from "../src/services/ai/suggestions.service.js";

test("builds context-aware questions from the supplied playback timeline events", () => {
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
  ]);

  assert.equal(suggestions.length, 4);
  assert.deepEqual(
    suggestions.map(({ type }) => type),
    ["scene", "character", "trivia", "glossary"],
  );
  assert.equal(suggestions[0].eventId, "scene-1");
  assert.match(suggestions[0].question, /hidden signal/);
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
