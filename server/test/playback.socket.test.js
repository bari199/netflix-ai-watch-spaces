import dotenv from "dotenv";
import { io } from "socket.io-client";
import mongoose from "mongoose";
import WatchSpace from "../src/models/WatchSpace.js";
import connectDB from "../src/config/db.js";

dotenv.config({ path: "../.env" });

const accessToken = process.env.SOCKET_TEST_TOKEN;
const watchSpaceId = "6aeca86c39e62cb020f09f85";

if (!accessToken) {
  console.error("SOCKET_TEST_TOKEN is missing");
  process.exit(1);
}

const socket = io("http://localhost:5000", {
  auth: { token: accessToken },
  reconnection: false,
  timeout: 5000,
  autoConnect: false, // Prevent automatic connection
});

const actions = [
  { action: "play", positionSeconds: 120, expectedState: "playing" },
  { action: "pause", positionSeconds: 120, expectedState: "paused" },
  { action: "seek", positionSeconds: 300, expectedState: "seeking" },
];

let currentIndex = 0;

const finish = async (success) => {
  socket.disconnect();

  try {
    await mongoose.disconnect();
  } catch {}

  process.exitCode = success ? 0 : 1;
};

const runNextAction = () => {
  if (currentIndex >= actions.length) {
    console.log("PASS: All playback actions completed");
    finish(true);
    return;
  }

  const current = actions[currentIndex];

  let acknowledgementReceived = false;
  let eventReceived = false;

  const completeAction = async () => {
    if (!acknowledgementReceived || !eventReceived) return;

    try {
      const room = await WatchSpace.findById(watchSpaceId).lean();

      if (
        room?.playback?.state !== current.expectedState ||
        room?.playback?.positionSeconds !== current.positionSeconds
      ) {
        console.error("FAIL: Database playback state mismatch");
        await finish(false);
        return;
      }

      console.log(
        `PASS: ${current.action.toUpperCase()} state saved in database`,
      );

      currentIndex++;
      runNextAction();
    } catch (error) {
      console.error("FAIL: Database verification:", error.message);
      await finish(false);
    }
  };

  socket.once("room.playback.update", (event) => {
    if (
      event.payload.state !== current.action ||
      event.payload.positionSeconds !== current.positionSeconds
    ) {
      console.error("FAIL: Playback event mismatch", event);
      finish(false);
      return;
    }

    eventReceived = true;
    console.log(`PASS: ${current.action.toUpperCase()} event broadcast`);
    completeAction();
  });

  socket.emit(
    "playback.control",
    {
      watchSpaceId,
      action: current.action,
      positionSeconds: current.positionSeconds,
    },
    (response) => {
      if (!response?.success) {
        console.error("FAIL:", response?.message);
        finish(false);
        return;
      }

      acknowledgementReceived = true;
      console.log(`PASS: ${current.action.toUpperCase()} acknowledged`);
      completeAction();
    },
  );
};

socket.on("connect", () => {
  console.log("PASS: Socket connected");

  socket.emit("room.join", { watchSpaceId }, (response) => {
    if (!response?.success) {
      console.error("FAIL: Room join:", response?.message);
      finish(false);
      return;
    }

    console.log("PASS: WatchSpace joined");
    runNextAction();
  });
});

socket.on("connect_error", (error) => {
  console.error("FAIL:", error.message);
  finish(false);
});

const startTest = async () => {
  try {
    await connectDB();
    console.log("PASS: Test MongoDB connected");

    socket.connect();
  } catch (error) {
    console.error("FAIL: MongoDB connection:", error.message);
    process.exitCode = 1;
  }
};

startTest();
