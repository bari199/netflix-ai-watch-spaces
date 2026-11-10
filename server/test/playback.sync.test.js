import dotenv from "dotenv";
import { io } from "socket.io-client";
import mongoose from "mongoose";
import connectDB from "../src/config/db.js";

dotenv.config({ path: "../.env" });

const accessToken = process.env.SOCKET_TEST_TOKEN;
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

  socket.emit("room.join", { watchSpaceId }, (response) => {
    if (!response?.success) {
      console.error("FAIL: Room join:", response?.message);
      finish(false);
      return;
    }

    console.log("PASS: WatchSpace joined");

    const clientSentAt = Date.now();
    let pongEventReceived = false;
    let acknowledgementReceived = false;

    const verify = () => {
      if (!pongEventReceived || !acknowledgementReceived) return;

      console.log("PASS: Sync ping/pong completed");
      finish(true);
    };

    socket.once("room.sync.pong", (event) => {
      if (
        event?.event !== "room.sync.pong" ||
        event?.watchSpaceId !== watchSpaceId ||
        event?.payload?.clientSentAt !== clientSentAt ||
        typeof event?.payload?.serverReceivedAt !== "number" ||
        typeof event?.ts !== "number"
      ) {
        console.error("FAIL: Invalid pong event", event);
        finish(false);
        return;
      }

      pongEventReceived = true;
      console.log("PASS: Sync pong event received");
      verify();
    });

    socket.emit(
      "room.sync.ping",
      { watchSpaceId, clientSentAt },
      (response) => {
        if (
          !response?.success ||
          response?.event !== "room.sync.pong" ||
          response?.payload?.clientSentAt !== clientSentAt
        ) {
          console.error("FAIL: Sync ping acknowledgement:", response);
          finish(false);
          return;
        }

        acknowledgementReceived = true;
        console.log("PASS: Sync ping acknowledged");
        verify();
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
