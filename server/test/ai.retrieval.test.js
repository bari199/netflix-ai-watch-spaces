import test from "node:test";
import assert from "node:assert/strict";
import WatchSpace from "../src/models/WatchSpace.js";
import Title from "../src/models/Title.js";
import { getTimelineEventsAtPlaybackPosition } from "../src/services/ai/timeline.service.js";
import { retrieveRelevantTimelineEvents } from "../src/services/ai/retrieval.service.js";

const WATCH_SPACE_ID = "64f000000000000000000001";
const TITLE_ID = "64f000000000000000000002";

const mockTimeline = (t, { positionSeconds, events }) => {
  const titleFilter = { _id: TITLE_ID, isPublished: true };

  t.mock.method(WatchSpace, "findById", async () => ({
    _id: WATCH_SPACE_ID,
    title: TITLE_ID,
    playback: { positionSeconds },
  }));
  t.mock.method(Title, "findOne", async (filter) => {
    assert.deepEqual(filter, titleFilter);
    return { _id: TITLE_ID, timeline: events };
  });
};

const event = (eventId, startTime, description, extra = {}) => ({
  eventId,
  startTime,
  endTime: startTime + 10,
  eventType: "scene",
  description,
  transcript: "",
  trivia: [],
  ...extra,
});

test("timeline retrieval excludes events after the WatchSpace playback position", async (t) => {
  mockTimeline(t, {
    positionSeconds: 15,
    events: [
      event("past", 2, "A past scene"),
      event("current", 12, "The current scene"),
      event("future", 16, "A future scene"),
    ],
  });

  const result = await getTimelineEventsAtPlaybackPosition(WATCH_SPACE_ID);

  assert.equal(result.currentTime, 15);
  assert.deepEqual(
    result.events.map(({ eventId }) => eventId),
    ["past", "current"],
  );
});

test("records timeline and playback diagnostics when all title events are in the future", async (t) => {
  mockTimeline(t, {
    positionSeconds: 15,
    events: [event("future", 20, "A future scene")],
  });
  const diagnostics = {};

  const result = await retrieveRelevantTimelineEvents(
    {
      watchSpaceId: WATCH_SPACE_ID,
      question: "What happens in the scene?",
    },
    { diagnostics },
  );

  assert.equal(result.timelineEventCount, 1);
  assert.equal(result.temporalCandidateCount, 0);
  assert.equal(result.retrievedCandidateCount, 0);
  assert.equal(diagnostics.watchSpaceLookupOutcome, "found");
  assert.equal(diagnostics.publishedTitleLookupOutcome, "found");
  assert.equal(diagnostics.timelineEventCount, 1);
  assert.equal(diagnostics.playbackPositionSeconds, 15);
  assert.equal(diagnostics.temporalCandidateCount, 0);
  assert.equal(diagnostics.retrievedCandidateCount, 0);
});

test("selects the active event using inclusive start and end bounds", async (t) => {
  mockTimeline(t, {
    positionSeconds: 60,
    events: [
      event("event-a", 20, "A preceding event", { endTime: 30 }),
      event("event-b", 45, "The active event", { endTime: 65 }),
      event("event-c", 40, "Another preceding event", { endTime: 50 }),
      event("event-d", 70, "A future event", { endTime: 80 }),
    ],
  });

  const result = await getTimelineEventsAtPlaybackPosition(WATCH_SPACE_ID);

  assert.deepEqual(
    result.events.map(({ eventId }) => eventId),
    ["event-a", "event-c", "event-b"],
  );
  assert.equal(
    result.events[result.temporalAnchorIndex].eventId,
    "event-b",
  );
});

test("uses the active event and its two immediate predecessors in chronological order", async (t) => {
  mockTimeline(t, {
    positionSeconds: 60,
    events: [
      event("event-a", 20, "A preceding event", { endTime: 30 }),
      event("event-b", 45, "The active event", { endTime: 65 }),
      event("event-c", 40, "Another preceding event", { endTime: 50 }),
      event("event-d", 70, "A future event", { endTime: 80 }),
    ],
  });

  const result = await retrieveRelevantTimelineEvents({
    watchSpaceId: WATCH_SPACE_ID,
    question: "Who enters the observatory?",
  });

  assert.deepEqual(
    result.events.map(({ eventId }) => eventId),
    ["event-a", "event-c", "event-b"],
  );
});

test("uses the latest preceding event as anchor when no event is active", async (t) => {
  mockTimeline(t, {
    positionSeconds: 60,
    events: [
      event("event-a", 10, "Oldest preceding event", { endTime: 20 }),
      event("event-b", 30, "Middle preceding event", { endTime: 40 }),
      event("event-c", 50, "Latest preceding event", { endTime: 59 }),
      event("event-d", 70, "Future event", { endTime: 80 }),
    ],
  });

  const result = await retrieveRelevantTimelineEvents({
    watchSpaceId: WATCH_SPACE_ID,
    question: "Who enters the observatory?",
  });

  assert.deepEqual(
    result.events.map(({ eventId }) => eventId),
    ["event-a", "event-b", "event-c"],
  );
});

test("chooses the overlapping active event with the greatest startTime", async (t) => {
  mockTimeline(t, {
    positionSeconds: 60,
    events: [
      event("early-active", 20, "Earlier overlapping event", { endTime: 70 }),
      event("later-active", 45, "Latest overlapping event", { endTime: 65 }),
      event("middle-active", 40, "Middle overlapping event", { endTime: 65 }),
    ],
  });

  const result = await getTimelineEventsAtPlaybackPosition(WATCH_SPACE_ID);

  assert.equal(
    result.events[result.temporalAnchorIndex].eventId,
    "later-active",
  );
});

test("retrieval includes a relevant preceding scene", async (t) => {
  mockTimeline(t, {
    positionSeconds: 30,
    events: [
      event("earlier-clue", 5, "Maya discovers the hidden key"),
      event("current-scene", 25, "Maya enters the station"),
      event("future-scene", 35, "The key opens the vault"),
    ],
  });

  const result = await retrieveRelevantTimelineEvents({
    watchSpaceId: WATCH_SPACE_ID,
    question: "Where did Maya find the hidden key?",
  });

  assert.equal(result.events[0].eventId, "earlier-clue");
  assert.ok(result.events.every(({ eventId }) => eventId !== "future-scene"));
});

test("includes the current event when question tokens have no lexical overlap", async (t) => {
  mockTimeline(t, {
    positionSeconds: 60,
    events: [
      event("current-scene", 45, "A visitor steps inside the building"),
      event("future-scene", 61, "Someone enters the observatory"),
    ],
  });

  const result = await retrieveRelevantTimelineEvents({
    watchSpaceId: WATCH_SPACE_ID,
    question: "Who enters the observatory?",
  });

  assert.deepEqual(
    result.events.map(({ eventId }) => eventId),
    ["current-scene"],
  );
  assert.equal(result.events[0].relevanceScore, 0);
});

test("includes the two immediately preceding eligible events as bounded context", async (t) => {
  mockTimeline(t, {
    positionSeconds: 60,
    events: [
      event("older-event", 5, "A person waits beside a house"),
      event("preceding-one", 20, "A figure carries a small box"),
      event("preceding-two", 35, "The lights turn on"),
      event("current-event", 45, "A visitor steps inside the building"),
      event("future-event", 61, "Someone enters the observatory"),
    ],
  });

  const result = await retrieveRelevantTimelineEvents({
    watchSpaceId: WATCH_SPACE_ID,
    question: "Who enters the observatory?",
  });

  assert.deepEqual(
    result.events.map(({ eventId }) => eventId),
    ["preceding-one", "preceding-two", "current-event"],
  );
  assert.ok(result.events.every(({ eventId }) => eventId !== "older-event"));
  assert.ok(result.events.every(({ eventId }) => eventId !== "future-event"));
});

test("future events are not included even when they strongly match the question", async (t) => {
  mockTimeline(t, {
    positionSeconds: 60,
    events: [
      event("eligible", 45, "A visitor steps inside the building"),
      event("future-match", 61, "The observatory visitor enters the observatory"),
    ],
  });

  const result = await retrieveRelevantTimelineEvents({
    watchSpaceId: WATCH_SPACE_ID,
    question: "Who enters the observatory?",
  });

  assert.ok(result.events.every(({ eventId }) => eventId !== "future-match"));
});

test("question relevance ranks the best matching event first", async (t) => {
  mockTimeline(t, {
    positionSeconds: 40,
    events: [
      event("partial-match", 10, "A red door appears", {
        transcript: "Someone mentions a key.",
      }),
      event("strong-match", 20, "The red key opens the door"),
      event("unrelated", 30, "A storm begins outside"),
    ],
  });

  const result = await retrieveRelevantTimelineEvents({
    watchSpaceId: WATCH_SPACE_ID,
    question: "Which red key opens the door?",
  });

  assert.deepEqual(
    result.events.map(({ eventId }) => eventId),
    ["strong-match", "partial-match", "unrelated"],
  );
  assert.ok(result.events[0].relevanceScore > result.events[1].relevanceScore);
  assert.equal(result.events[2].relevanceScore, 0);
});

test("retrieves a relevant event for a Bengali question", async (t) => {
  mockTimeline(t, {
    positionSeconds: 30,
    events: [
      event("bengali-match", 10, "রাহিম পুরোনো বাড়িতে চাবি খুঁজে পায়"),
      event("unrelated", 20, "মিতা নদীর ধারে অপেক্ষা করে"),
    ],
  });

  const result = await retrieveRelevantTimelineEvents({
    watchSpaceId: WATCH_SPACE_ID,
    question: "রাহিম কোথায় চাবি খুঁজে পায়?",
  });

  assert.deepEqual(
    result.events.map(({ eventId }) => eventId),
    ["bengali-match", "unrelated"],
  );
  assert.equal(result.events[1].relevanceScore, 0);
});

test("retrieves canonical text for every supported timeline event type", async (t) => {
  const eventTypes = [
    "scene",
    "characterAppearance",
    "trivia",
    "glossary",
    "variationPoint",
  ];
  mockTimeline(t, {
    positionSeconds: 100,
    events: eventTypes.map((eventType, index) =>
      event(`typed-${index}`, index * 10 + 1, "Legacy description.", {
        eventType,
        text: `A quasar appears in event ${index}.`,
      }),
    ),
  });

  const result = await retrieveRelevantTimelineEvents({
    watchSpaceId: WATCH_SPACE_ID,
    question: "Where does a quasar appear?",
  });

  assert.equal(result.events.length, eventTypes.length);
  assert.deepEqual(
    result.events.map(({ eventId }) => eventId).sort(),
    eventTypes.map((_, index) => `typed-${index}`).sort(),
  );
  assert.ok(result.events.every(({ relevanceScore }) => relevanceScore > 0));
});

test("uses a legacy description when canonical text is absent", async (t) => {
  mockTimeline(t, {
    positionSeconds: 20,
    events: [
      event("legacy-content", 5, "The silver key opens the observatory."),
    ],
  });

  const result = await retrieveRelevantTimelineEvents({
    watchSpaceId: WATCH_SPACE_ID,
    question: "Where is the silver key?",
  });

  assert.ok(result.events[0].relevanceScore > 0);
});

test("uses text instead of description when both content fields exist", async (t) => {
  mockTimeline(t, {
    positionSeconds: 20,
    events: [
      event("canonical-content", 5, "The silver key opens the observatory.", {
        text: "Mara watches the stars.",
      }),
    ],
  });

  const result = await retrieveRelevantTimelineEvents({
    watchSpaceId: WATCH_SPACE_ID,
    question: "Where is the silver key?",
  });

  assert.equal(result.events[0].relevanceScore, 0);
});

test("does not fall back to description when canonical text is blank", async (t) => {
  mockTimeline(t, {
    positionSeconds: 20,
    events: [
      event("blank-canonical-content", 5, "Mara finds the observatory.", {
        text: "  ",
      }),
    ],
  });

  const result = await retrieveRelevantTimelineEvents({
    watchSpaceId: WATCH_SPACE_ID,
    question: "Who finds the observatory?",
  });

  assert.equal(result.events[0].relevanceScore, 0);
});

test("keeps transcript and trivia as supplementary lexical search fields", async (t) => {
  mockTimeline(t, {
    positionSeconds: 30,
    events: [
      event("transcript-match", 5, "A quiet scene.", {
        text: "A still night.",
        transcript: "Mara notices a comet.",
      }),
      event("trivia-match", 15, "A glossary entry.", {
        text: "A bright lantern.",
        trivia: ["The comet was discovered in winter."],
      }),
    ],
  });

  const result = await retrieveRelevantTimelineEvents({
    watchSpaceId: WATCH_SPACE_ID,
    question: "comet",
  });

  assert.ok(
    result.events.find(({ eventId }) => eventId === "transcript-match")
      .relevanceScore > 0,
  );
  assert.ok(
    result.events.find(({ eventId }) => eventId === "trivia-match")
      .relevanceScore > 0,
  );
});

test("ranks matching Bengali and English terms in a mixed-language question", async (t) => {
  mockTimeline(t, {
    positionSeconds: 30,
    events: [
      event("partial-match", 10, "রাহিম station-এর কাছে অপেক্ষা করে"),
      event("mixed-match", 20, "রাহিম hidden key খুঁজে পায়"),
    ],
  });

  const result = await retrieveRelevantTimelineEvents({
    watchSpaceId: WATCH_SPACE_ID,
    question: "রাহিম কোথায় hidden key খুঁজে পায়?",
  });

  assert.deepEqual(
    result.events.map(({ eventId }) => eventId),
    ["mixed-match", "partial-match"],
  );
});

test("keeps the temporal candidate separate from lexical relevance when no event matches", async (t) => {
  mockTimeline(t, {
    positionSeconds: 20,
    events: [event("scene", 5, "A quiet walk through the forest")],
  });

  const result = await retrieveRelevantTimelineEvents({
    watchSpaceId: WATCH_SPACE_ID,
    question: "Who owns the spaceship?",
  });

  assert.deepEqual(
    result.events.map(({ eventId, relevanceScore }) => ({
      eventId,
      relevanceScore,
    })),
    [{ eventId: "scene", relevanceScore: 0 }],
  );
});

test("keeps the result set within the existing maximum of five", async (t) => {
  mockTimeline(t, {
    positionSeconds: 100,
    events: [
      event("match-one", 10, "A silver key opens the door"),
      event("match-two", 20, "The silver key is hidden"),
      event("match-three", 30, "A silver key shines"),
      event("context-one", 70, "A figure crosses the room"),
      event("context-two", 80, "The lights turn on"),
      event("current", 90, "A visitor steps inside"),
    ],
  });

  const result = await retrieveRelevantTimelineEvents({
    watchSpaceId: WATCH_SPACE_ID,
    question: "Where is the silver key?",
  });

  assert.equal(result.events.length, 5);
  assert.ok(result.events.some(({ eventId }) => eventId === "current"));
  assert.ok(result.events.some(({ eventId }) => eventId === "context-two"));
  assert.ok(result.events.some(({ eventId }) => eventId === "context-one"));
  assert.ok(
    result.events.findIndex(({ eventId }) => eventId === "match-three") <
      result.events.findIndex(({ eventId }) => eventId === "match-two"),
  );
});

test("fails closed when eligible timeline events contain duplicate eventIds", async (t) => {
  mockTimeline(t, {
    positionSeconds: 60,
    events: [
      event("duplicate", 20, "A matching lexical event"),
      event("preceding", 35, "A preceding event"),
      event("duplicate", 45, "The current event"),
    ],
  });

  await assert.rejects(
    retrieveRelevantTimelineEvents({
      watchSpaceId: WATCH_SPACE_ID,
      question: "Which matching lexical event?",
    }),
    /duplicate eventId/,
  );
});

test("preserves lexical scores for temporal candidates", async (t) => {
  mockTimeline(t, {
    positionSeconds: 60,
    events: [
      event("preceding-one", 20, "A person waits", { endTime: 30 }),
      event("preceding-two", 35, "Someone walks", { endTime: 40 }),
      event("active-match", 45, "Maya finds the silver key", {
        endTime: 65,
      }),
    ],
  });

  const result = await retrieveRelevantTimelineEvents({
    watchSpaceId: WATCH_SPACE_ID,
    question: "Who finds the silver key?",
  });

  assert.equal(result.events[0].eventId, "active-match");
  assert.ok(result.events[0].relevanceScore > 0);
});

test("retrieval rejects invalid IDs and empty questions", async () => {
  await assert.rejects(
    retrieveRelevantTimelineEvents({
      watchSpaceId: "not-an-id",
      question: "What happened?",
    }),
    /valid WatchSpace ID/,
  );
  await assert.rejects(
    retrieveRelevantTimelineEvents({
      watchSpaceId: WATCH_SPACE_ID,
      question: "   ",
    }),
    /question is required/,
  );
  await assert.rejects(
    getTimelineEventsAtPlaybackPosition("not-an-id"),
    /valid WatchSpace ID/,
  );
});
