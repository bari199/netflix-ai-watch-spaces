import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import WatchSpace from "../src/models/WatchSpace.js";
import {
  applyDueVariation,
  applyDueClosedVariation,
} from "../src/sockets/playback.socket.js";
import {
  closeExpiredAutomaticVote,
  resolveVariationWinner,
  triggerDueAutomaticVariationVote,
} from "../src/sockets/variation.socket.js";

const options = [
  { id: "north", label: "Go north" },
  { id: "south", label: "Go south" },
  { id: "east", label: "Go east" },
];

test("automatic voting opens once when playback crosses a variation marker", async (t) => {
  const watchSpaceId = new mongoose.Types.ObjectId().toString();
  const event = {
    eventId: "timeline-event-40",
    variationId: "ending-choice",
    eventType: "variationPoint",
    startTime: 40,
    options,
  };
  const watchSpace = {
    _id: watchSpaceId,
    status: "active",
    playbackMode: "automatic",
    playback: { state: "playing", positionSeconds: 40.2 },
    votingEnabled: true,
    activeVote: null,
    triggeredVariationEventIds: [],
    title: { timeline: [event] },
    host: "host-user-id",
  };
  let update;
  let emitted;

  t.mock.method(WatchSpace, "findOneAndUpdate", async (filter, changes) => {
    assert.equal(filter.playbackMode, "automatic");
    assert.equal(filter.triggeredVariationEventIds.$ne, event.eventId);
    update = changes;
    return { ...watchSpace, activeVote: changes.$set.activeVote };
  });
  t.mock.method(globalThis, "setTimeout", () => ({
    unref() {},
  }));

  const io = {
    to(room) {
      return {
        emit(eventName, payload) {
          emitted = { room, eventName, payload };
        },
      };
    },
  };

  const started = await triggerDueAutomaticVariationVote(
    io,
    watchSpaceId,
    39.2,
    40.2,
    watchSpace,
  );

  assert.equal(started, true);
  assert.equal(update.$set.activeVote.mode, "automatic");
  assert.equal(update.$set.activeVote.durationSeconds, 60);
  assert.equal(update.$set.activeVote.applyAtSeconds, 40);
  assert.deepEqual(update.$addToSet, {
    triggeredVariationEventIds: event.eventId,
  });
  assert.equal(emitted.eventName, "room.variation.voteOpen");
  assert.equal(emitted.payload.mode, "automatic");
  assert.equal(emitted.payload.variationId, event.variationId);
});

test("automatic voting does not reopen a timeline marker already triggered", async (t) => {
  const watchSpace = {
    _id: new mongoose.Types.ObjectId().toString(),
    status: "active",
    playbackMode: "automatic",
    playback: { state: "playing", positionSeconds: 41 },
    votingEnabled: true,
    activeVote: null,
    triggeredVariationEventIds: ["timeline-event-40"],
    title: {
      timeline: [{
        eventId: "timeline-event-40",
        variationId: "ending-choice",
        eventType: "variationPoint",
        startTime: 40,
        options,
      }],
    },
    host: "host-user-id",
  };

  const started = await triggerDueAutomaticVariationVote(
    {},
    watchSpace._id,
    39,
    41,
    watchSpace,
  );

  assert.equal(started, false);
});

test("an expired automatic poll applies at the current playback position", async (t) => {
  const watchSpaceId = new mongoose.Types.ObjectId().toString();
  const vote = {
    variationId: "ending-choice",
    mode: "automatic",
    status: "open",
    closesAt: new Date(Date.now() - 1000),
    options,
    votes: [{ optionId: "south" }],
    applyAtSeconds: 40,
  };
  let update;
  let emitted;

  t.mock.method(WatchSpace, "findById", async () => ({
    activeVote: vote,
    playback: { positionSeconds: 82 },
  }));
  t.mock.method(WatchSpace, "findOneAndUpdate", async (filter, changes) => {
    assert.equal(filter["activeVote.status"], "open");
    update = changes;
    return {
      activeVote: {
        ...vote,
        status: "closed",
        winningOptionId: "south",
        applyAtSeconds: changes.$set["activeVote.applyAtSeconds"],
      },
    };
  });

  const io = {
    to(room) {
      return {
        emit(eventName, payload) {
          emitted = { room, eventName, payload };
        },
      };
    },
  };

  const closed = await closeExpiredAutomaticVote(io, watchSpaceId);

  assert.equal(closed, true);
  assert.equal(update.$set["activeVote.applyAtSeconds"], 82);
  assert.equal(emitted.eventName, "room.variation.voteResult");
  assert.equal(emitted.payload.winningOptionId, "south");
  assert.equal(emitted.payload.applyAtSeconds, 82);
  assert.equal(emitted.payload.mode, "automatic");
});

test("variation vote ties resolve by authored option order", () => {
  const result = resolveVariationWinner(options, [
    { optionId: "north" },
    { optionId: "south" },
  ]);

  assert.deepEqual(result.voteCounts, { north: 1, south: 1, east: 0 });
  assert.equal(result.winningOptionId, "north");
});

test("variation votes with no valid ballots deterministically select the first authored option", () => {
  const result = resolveVariationWinner(options, [
    { optionId: "not-an-option" },
  ]);

  assert.deepEqual(result.voteCounts, { north: 0, south: 0, east: 0 });
  assert.equal(result.winningOptionId, "north");
});

test("a closed vote applies after its marker even if the marker was crossed before the deadline", async (t) => {
  const watchSpaceId = new mongoose.Types.ObjectId().toString();
  const appliedAt = new Date();
  let emitted;
  t.mock.method(WatchSpace, "findOneAndUpdate", async (filter) => {
    assert.deepEqual(filter.$expr, {
      $lte: ["$activeVote.applyAtSeconds", 50],
    });
    return {
      activeVote: {
        variationId: "ending-choice",
        winningOptionId: "north",
        applyAtSeconds: 30,
        appliedAt,
      },
    };
  });
  const io = {
    to(room) {
      return {
        emit(eventName, payload) {
          emitted = { room, eventName, payload };
        },
      };
    },
  };

  await applyDueVariation(io, watchSpaceId, 49, 50, "playing");

  assert.equal(emitted.room, `watchspace:${watchSpaceId}`);
  assert.equal(emitted.eventName, "room.variation.applied");
  assert.equal(emitted.payload.winningOptionId, "north");
});

test("a closed vote applies after the timeline marker has already passed", async (t) => {
  const watchSpaceId = new mongoose.Types.ObjectId().toString();
  const appliedAt = new Date();
  let emitted;

  t.mock.method(WatchSpace, "findOneAndUpdate", async (filter) => {
    assert.equal(filter._id, watchSpaceId);
    assert.equal(filter["activeVote.status"], "closed");
    assert.equal(filter["activeVote.appliedAt"], null);
    assert.deepEqual(filter.$expr, {
      $lte: ["$activeVote.applyAtSeconds", 50],
    });

    return {
      activeVote: {
        variationId: "ending-choice",
        winningOptionId: "south",
        applyAtSeconds: 30,
        appliedAt,
      },
    };
  });

  const io = {
    to(room) {
      return {
        emit(eventName, payload) {
          emitted = { room, eventName, payload };
        },
      };
    },
  };

  await applyDueClosedVariation(io, watchSpaceId, 50);

  assert.equal(emitted.room, `watchspace:${watchSpaceId}`);
  assert.equal(emitted.eventName, "room.variation.applied");
  assert.equal(emitted.payload.watchSpaceId, watchSpaceId);
  assert.equal(emitted.payload.winningOptionId, "south");
  assert.equal(emitted.payload.applyAtSeconds, 30);
});
