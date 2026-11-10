import dotenv from "dotenv";
import { io } from "socket.io-client";
import mongoose from "mongoose";
import WatchSpace from "../src/models/WatchSpace.js";
import connectDB from "../src/config/db.js";

dotenv.config({ path: "../.env" });

const accessToken = process.env.VIEWER_SOCKET_TEST_TOKEN;
const watchSpaceId = "6af20bef2ce49f8c669bc91f";

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

let finished = false;

const finish = async (success) => {
  if (finished) return;
  finished = true;

  socket.disconnect();

  try {
    await mongoose.disconnect();
  } catch {}

  process.exitCode = success ? 0 : 1;
};

socket.on("connect", async () => {
  console.log("PASS: Viewer socket connected");

  socket.emit("room.join", { watchSpaceId }, async (joinResponse) => {
    if (!joinResponse?.success) {
      console.error("FAIL: Room join:", joinResponse?.message);
      await finish(false);
      return;
    }

    console.log("PASS: Viewer joined WatchSpace socket room");

    try {
      const before = await WatchSpace.findById(watchSpaceId).lean();

      if (!before) {
        throw new Error("WatchSpace not found");
      }

      const previousState = before.playback?.state;
      const previousPosition = before.playback?.positionSeconds;

      let playbackEventReceived = false;

      socket.once("room.playback.update", () => {
        playbackEventReceived = true;
      });

      socket.emit(
        "playback.control",
        {
          watchSpaceId,
          action: "play",
          positionSeconds: 120,
        },
        async (response) => {
          try {
            if (response?.success) {
              console.error("FAIL: Viewer was allowed to control playback");
              await finish(false);
              return;
            }

            if (
              response?.message !==
              "Only the WatchSpace host can control playback"
            ) {
              console.error("FAIL: Unexpected error:", response?.message);
              await finish(false);
              return;
            }

            console.log("PASS: Viewer playback control rejected");

            setTimeout(async () => {
              try {
                const after = await WatchSpace.findById(watchSpaceId).lean();

                if (
                  after?.playback?.state !== previousState ||
                  after?.playback?.positionSeconds !== previousPosition
                ) {
                  console.error("FAIL: Playback state changed unexpectedly");
                  await finish(false);
                  return;
                }

                if (playbackEventReceived) {
                  console.error("FAIL: Unauthorized playback event broadcast");
                  await finish(false);
                  return;
                }

                console.log("PASS: Database playback state unchanged");
                console.log("PASS: No unauthorized playback event broadcast");
                console.log("PASS: Viewer authorization test completed");

                await finish(true);
              } catch (error) {
                console.error("FAIL: Verification:", error.message);
                await finish(false);
              }
            }, 300);
          } catch (error) {
            console.error("FAIL:", error.message);
            await finish(false);
          }
        },
      );
    } catch (error) {
      console.error("FAIL: Database verification:", error.message);
      await finish(false);
    }
  });
});

socket.on("connect_error", async (error) => {
  console.error("FAIL: Socket connection:", error.message);
  await finish(false);
});

const startTest = async () => {
  try {
    await connectDB();
    console.log("PASS: Test MongoDB connected");

    socket.connect();
  } catch (error) {
    console.error("FAIL: MongoDB connection:", error.message);
    await finish(false);
  }
};

startTest();
