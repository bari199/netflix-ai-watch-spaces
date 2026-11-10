import dotenv from "dotenv";
import { io } from "socket.io-client";
import mongoose from "mongoose";
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

socket.on("connect", () => {
  console.log("PASS: Socket connected");

  socket.emit("room.join", { watchSpaceId }, (joinResponse) => {
    if (!joinResponse?.success) {
      console.error("FAIL: Room join:", joinResponse?.message);
      finish(false);
      return;
    }

    console.log("PASS: WatchSpace joined");

    socket.emit(
      "room.sync.report",
      { watchSpaceId, positionSeconds: 125.5 },
      (response) => {
        if (
          !response?.success ||
          response?.positionSeconds !== 125.5 ||
          response?.watchSpaceId !== watchSpaceId ||
          response?.role !== "viewer" ||
          typeof response?.receivedAt !== "number"
        ) {
          console.error("FAIL: Position report:", response);
          finish(false);
          return;
        }

        console.log("PASS: Viewer playback position report accepted");
        console.log("PASS: Position report response validated");

        finish(true);
      },
    );
  });
});

socket.on("connect_error", (error) => {
  console.error("FAIL: Socket connection:", error.message);
  finish(false);
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
