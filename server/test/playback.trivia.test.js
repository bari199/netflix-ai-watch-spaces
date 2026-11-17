import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Title from "../src/models/Title.js";
import { triggerDueTriviaEvents } from "../src/sockets/playback.socket.js";

const createWatchSpace = ({ triviaEnabled = true, events }) => ({
  status: "active",
  triviaEnabled,
  title: { timeline: events },
  triggeredTriviaEventIds: [],
  saved: 0,
  async save() {
    this.saved += 1;
  },
});

const createIo = () => {
  const emitted = [];
  return {
    emitted,
    to(room) {
      return {
        emit(eventName, payload) {
          emitted.push({ room, eventName, payload });
        },
      };
    },
  };
};

test("trivia triggers when authoritative playback crosses a marker, including a skipped window", async () => {
  const watchSpaceId = new mongoose.Types.ObjectId().toString();
  const watchSpace = createWatchSpace({
    events: [
      {
        eventId: "trivia-crossed",
        eventType: "trivia",
        startTime: 10,
        endTime: 12,
        text: "An authored fact.",
      },
      {
        eventId: "scene-not-trivia",
        eventType: "scene",
        startTime: 12,
        endTime: 15,
        text: "A scene.",
      },
    ],
  });
  const io = createIo();

  await triggerDueTriviaEvents(io, watchSpaceId, 5, 20, watchSpace);
  await triggerDueTriviaEvents(io, watchSpaceId, 20, 21, watchSpace);

  assert.equal(io.emitted.length, 1);
  assert.equal(io.emitted[0].eventName, "room.ai.trivia");
  assert.equal(io.emitted[0].payload.eventId, "trivia-crossed");
  assert.equal(io.emitted[0].payload.text, "An authored fact.");
  assert.deepEqual(watchSpace.triggeredTriviaEventIds, ["trivia-crossed"]);
});

test("trivia is not emitted when disabled or when metadata is ineligible", async () => {
  const watchSpaceId = new mongoose.Types.ObjectId().toString();
  const io = createIo();
  const watchSpace = createWatchSpace({
    triviaEnabled: false,
    events: [
      {
        eventId: "disabled",
        eventType: "trivia",
        startTime: 5,
        endTime: 8,
        text: "Disabled fact.",
      },
    ],
  });

  await triggerDueTriviaEvents(io, watchSpaceId, 1, 7, watchSpace);
  assert.equal(io.emitted.length, 0);

  watchSpace.triviaEnabled = true;
  watchSpace.title.timeline.push(
    {
      eventId: "malformed-range",
      eventType: "trivia",
      startTime: 10,
      endTime: 9,
      text: "Malformed fact.",
    },
    {
      eventId: "blank-content",
      eventType: "trivia",
      startTime: 10,
      endTime: 15,
      text: " ",
    },
  );
  await triggerDueTriviaEvents(io, watchSpaceId, 8, 12, watchSpace);
  assert.equal(io.emitted.length, 0);
});

test("unpopulated Title ObjectIds are looked up before evaluating the timeline", async (t) => {
  const watchSpaceId = new mongoose.Types.ObjectId().toString();
  const titleId = new mongoose.Types.ObjectId();
  const watchSpace = createWatchSpace({ events: [] });
  watchSpace.title = titleId;
  const titleRecord = {
    timeline: [
      {
        eventId: "looked-up-trivia",
        eventType: "trivia",
        startTime: 5,
        endTime: 10,
        text: "Retrieved from Title.",
      },
    ],
  };
  t.mock.method(Title, "findById", () => ({
    select: async () => titleRecord,
  }));
  const io = createIo();

  await triggerDueTriviaEvents(io, watchSpaceId, 1, 7, watchSpace);

  assert.equal(io.emitted.length, 1);
  assert.equal(io.emitted[0].payload.eventId, "looked-up-trivia");
});
