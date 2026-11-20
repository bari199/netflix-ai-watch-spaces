import dotenv from "dotenv";
import { io } from "socket.io-client";
import mongoose from "mongoose";
import WatchSpace from "../src/models/WatchSpace.js";
import Title from "../src/models/Title.js";
import connectDB from "../src/config/db.js";

dotenv.config({ path: "../.env" });

const accessToken = process.env.SOCKET_TEST_TOKEN;
const watchSpaceId = "6afda416ecfdba5cdc206371";

if (!accessToken) {
  console.error("SOCKET_TEST_TOKEN is missing");
  process.exit(1);
}

const socket = io("http://localhost:5000", {
  auth: { token: accessToken },
  reconnection: false,
  timeout: 5000,
  autoConnect: false,
});

let actions = [];
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
  let verificationStarted = false;

  const completeAction = async () => {
    if (!acknowledgementReceived || !eventReceived || verificationStarted) {
      return;
    }

    verificationStarted = true;

    try {
      const room = await WatchSpace.findById(watchSpaceId).lean();

      if (
        room?.playback?.state !== current.expectedState ||
        room?.playback?.positionSeconds !== current.positionSeconds
      ) {
        console.error("FAIL: Database playback state mismatch");
        console.error("Expected:", {
          state: current.expectedState,
          positionSeconds: current.positionSeconds,
        });
        console.error("Actual:", room?.playback);

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

    const watchSpace = await WatchSpace.findById(watchSpaceId)
      .select("_id title host")
      .lean();

    if (!watchSpace) {
      console.error(
        "FAIL: WatchSpace does not exist in the connected database",
      );

      console.error("WatchSpace ID:", watchSpaceId);

      await finish(false);
      return;
    }

    console.log("PASS: WatchSpace found:", watchSpace._id.toString());
    console.log("WatchSpace host ID:", watchSpace.host?.toString());

    const titleId = watchSpace.title?._id || watchSpace.title;

    const title = await Title.findById(titleId).select("title duration").lean();

    if (
      !title ||
      typeof title.duration !== "number" ||
      !Number.isFinite(title.duration) ||
      title.duration <= 0
    ) {
      console.error("FAIL: Valid title duration not found");
      await finish(false);
      return;
    }

    const durationSeconds = title.duration;

    console.log("PASS: Title found:", title.title);
    console.log("Title duration:", durationSeconds, "seconds");

    // Select valid positions within the actual video duration.
    const playbackPosition = Math.min(120, Math.floor(durationSeconds / 2));

    const seekPosition = Math.min(300, Math.floor(durationSeconds * 0.75));

    actions = [
      {
        action: "play",
        positionSeconds: playbackPosition,
        expectedState: "playing",
      },
      {
        action: "pause",
        positionSeconds: playbackPosition,
        expectedState: "paused",
      },
      {
        action: "seek",
        positionSeconds: seekPosition,
        expectedState: "paused",
      },
    ];

    console.log("Playback test positions:", {
      play: playbackPosition,
      pause: playbackPosition,
      seek: seekPosition,
    });

    socket.connect();
  } catch (error) {
    console.error("FAIL: Test setup:", error.message);
    await finish(false);
  }
};

startTest();
