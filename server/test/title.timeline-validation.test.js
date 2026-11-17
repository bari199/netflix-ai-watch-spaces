import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Title from "../src/models/Title.js";

process.env.MINIO_BUCKET = "timeline-validation-test";
const originalConsoleLog = console.log;
console.log = () => {};
const { createTitle, updateTitle, validateTimelineMetadata } = await import(
  "../src/services/title.service.js"
);
const minioClient = (await import("../src/config/minio.js")).default;
console.log = originalConsoleLog;

const event = (overrides = {}) => ({
  eventId: "event-1",
  eventType: "scene",
  startTime: 0,
  endTime: 10,
  text: "A scene occurs.",
  ...overrides,
});

const validVariationPoint = (overrides = {}) =>
  event({
    eventType: "variationPoint",
    variationId: "variation-1",
    options: [
      { id: "option-1", label: "Option one" },
      { id: "option-2", label: "Option two" },
    ],
    ...overrides,
  });

const assertTimelineValidationError = (callback, message) => {
  assert.throws(callback, (error) => {
    assert.equal(error.name, "ValidationError");
    assert.match(error.message, message);
    return true;
  });
};

test("accepts each supported timeline event type", () => {
  const timeline = [
    event(),
    event({
      eventId: "event-2",
      eventType: "characterAppearance",
      characterId: "character-1",
      characterName: "Mara",
    }),
    event({
      eventId: "event-3",
      eventType: "trivia",
      text: "A trivia fact.",
    }),
    event({
      eventId: "event-4",
      eventType: "glossary",
      text: "Term: its definition.",
    }),
    validVariationPoint({ eventId: "event-5" }),
  ];

  assert.doesNotThrow(() => validateTimelineMetadata(timeline, 10));
});

test("accepts inclusive timestamp boundaries and Mongoose-compatible numeric strings", () => {
  assert.doesNotThrow(() =>
    validateTimelineMetadata(
      [event({ startTime: "10", endTime: "10" })],
      "10",
    ),
  );
});

test("accepts legacy description-only content and does not rewrite either content field", () => {
  const legacyEvent = event({ text: undefined, description: "Legacy text." });
  const canonicalEvent = event({
    eventId: "event-2",
    description: "Older description.",
    text: "Canonical text.",
  });
  const originalLegacy = { ...legacyEvent };
  const originalCanonical = { ...canonicalEvent };

  assert.doesNotThrow(() =>
    validateTimelineMetadata([legacyEvent, canonicalEvent], 10),
  );
  assert.deepEqual(legacyEvent, originalLegacy);
  assert.deepEqual(canonicalEvent, originalCanonical);
});

test("uses text as authoritative when text and description are both present", () => {
  assertTimelineValidationError(
    () =>
      validateTimelineMetadata(
        [event({ text: "  ", description: "Legacy fallback is not used." })],
        10,
      ),
    /text or legacy description is required/,
  );
});

test("validates the Mongoose schema enum while allowing canonical and legacy content", async () => {
  const titleFields = {
    name: "Schema test",
    duration: 10,
    videoKey: "test.mp4",
    createdBy: new mongoose.Types.ObjectId(),
  };
  const canonicalTitle = new Title({
    ...titleFields,
    timeline: [event()],
  });
  const legacyTitle = new Title({
    ...titleFields,
    timeline: [
      event({ text: undefined, description: "Legacy content." }),
    ],
  });
  const invalidTypeTitle = new Title({
    ...titleFields,
    timeline: [event({ eventType: "unsupported" })],
  });

  await canonicalTitle.validate();
  await legacyTitle.validate();
  await assert.rejects(invalidTypeTitle.validate(), (error) => {
    assert.ok(error.errors["timeline.0.eventType"]);
    return true;
  });
});

test("rejects malformed, unsupported, or duplicate event identifiers", () => {
  assertTimelineValidationError(
    () => validateTimelineMetadata([event({ eventType: "unsupported" })], 10),
    /event type is not supported/,
  );
  assertTimelineValidationError(
    () => validateTimelineMetadata([event({ eventId: "  " })], 10),
    /event ID is required/,
  );
  assertTimelineValidationError(
    () =>
      validateTimelineMetadata(
        [event({ eventId: "same" }), event({ eventId: " same " })],
        10,
      ),
    /event IDs must be unique/,
  );
});

test("rejects invalid time ranges and out-of-duration events", () => {
  const cases = [
    [event({ startTime: Number.NaN }), /finite and nonnegative/],
    [event({ endTime: Number.POSITIVE_INFINITY }), /finite and nonnegative/],
    [event({ startTime: -1 }), /finite and nonnegative/],
    [event({ startTime: 11, endTime: 10 }), /endTime must be greater/],
    [event({ endTime: 11 }), /cannot end after the Title duration/],
  ];

  for (const [invalidEvent, message] of cases) {
    assertTimelineValidationError(
      () => validateTimelineMetadata([invalidEvent], 10),
      message,
    );
  }
});

test("rejects blank canonical content and missing legacy content", () => {
  assertTimelineValidationError(
    () =>
      validateTimelineMetadata(
        [event({ text: undefined, description: " " })],
        10,
      ),
    /text or legacy description is required/,
  );
  assertTimelineValidationError(
    () =>
      validateTimelineMetadata(
        [event({ text: 42, description: "Legacy content." })],
        10,
      ),
    /text or legacy description is required/,
  );
});

test("requires a characterId for character appearance events", () => {
  assertTimelineValidationError(
    () =>
      validateTimelineMetadata(
        [event({ eventType: "characterAppearance" })],
        10,
      ),
    /require a characterId/,
  );
});

test("requires valid variation IDs and at least two unique labeled options", () => {
  const validPoint = validVariationPoint();
  const invalidPoints = [
    [
      validVariationPoint({ variationId: " " }),
      /require a variationId/,
    ],
    [validVariationPoint({ options: [] }), /at least two options/],
    [
      validVariationPoint({
        options: [
          { id: "same", label: "One" },
          { id: " same ", label: "Two" },
        ],
      }),
      /option IDs must be unique/,
    ],
    [
      validVariationPoint({
        options: [
          { id: "option-1", label: "One" },
          { id: "option-2", label: " " },
        ],
      }),
      /nonblank IDs and labels/,
    ],
    [
      validVariationPoint({
        options: [
          { id: " ", label: "One" },
          { id: "option-2", label: "Two" },
        ],
      }),
      /nonblank IDs and labels/,
    ],
  ];

  assert.doesNotThrow(() => validateTimelineMetadata([validPoint], 10));

  for (const [invalidPoint, message] of invalidPoints) {
    assertTimelineValidationError(
      () => validateTimelineMetadata([invalidPoint], 10),
      message,
    );
  }
});

test("validates create timelines before uploading media", async (t) => {
  let uploadCount = 0;
  let createCount = 0;
  t.mock.method(minioClient, "send", async () => {
    uploadCount += 1;
  });
  t.mock.method(Title, "create", async () => {
    createCount += 1;
  });

  await assert.rejects(
    createTitle(
      {
        duration: 10,
        timeline: [event({ endTime: 11 })],
      },
      "user-id",
      { mimetype: "video/mp4", buffer: Buffer.from("video") },
    ),
    (error) => error.name === "ValidationError",
  );
  assert.equal(uploadCount, 0);
  assert.equal(createCount, 0);
});

test("validates a duration-only update against the stored timeline before upload or update", async (t) => {
  let uploadCount = 0;
  let updateCount = 0;
  const existingTitle = {
    duration: 100,
    timeline: [event({ endTime: 65 })],
    thumbnailKey: "",
  };
  t.mock.method(Title, "findById", async () => existingTitle);
  t.mock.method(Title, "findByIdAndUpdate", async () => {
    updateCount += 1;
  });
  t.mock.method(minioClient, "send", async () => {
    uploadCount += 1;
  });

  await assert.rejects(
    updateTitle("title-id", { duration: 60 }),
    (error) => error.name === "ValidationError",
  );
  assert.equal(uploadCount, 0);
  assert.equal(updateCount, 0);
});
