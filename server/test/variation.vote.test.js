import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import WatchSpace from "../src/models/WatchSpace.js";
import {
  applyDueVariation,
  applyDueClosedVariation,
} from "../src/sockets/playback.socket.js";
import { resolveVariationWinner } from "../src/sockets/variation.socket.js";

const options = [
  { id: "north", label: "Go north" },
  { id: "south", label: "Go south" },
  { id: "east", label: "Go east" },
];

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
