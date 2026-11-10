import dotenv from "dotenv";
import { io } from "socket.io-client";
import mongoose from "mongoose";
import connectDB from "../src/config/db.js";

dotenv.config({ path: "../.env" });

const hostToken = process.env.HOST_SOCKET_TEST_TOKEN;
const viewerToken = process.env.VIEWER_SOCKET_TEST_TOKEN;

const watchSpaceId = "6af20bef2ce49f8c669bc91f";

if (!hostToken || !viewerToken) {
  console.error("FAIL: Host or Viewer token is missing from .env");
  process.exit(1);
}

const createSocket = (token) =>
  io("http://localhost:5000", {
    auth: { token },
    reconnection: false,
    timeout: 5000,
    autoConnect: false,
  });

const hostSocket = createSocket(hostToken);
const viewerSocket = createSocket(viewerToken);

let finished = false;

const finish = async (success) => {
  if (finished) return;
  finished = true;

  hostSocket.disconnect();
  viewerSocket.disconnect();

  try {
    await mongoose.disconnect();
  } catch {}

  process.exitCode = success ? 0 : 1;
};

const connectSocket = (socket, label) =>
  new Promise((resolve, reject) => {
    socket.once("connect", () => {
      console.log(`PASS: ${label} socket connected`);
      resolve();
    });

    socket.once("connect_error", reject);
    socket.connect();
  });

const joinRoom = (socket, label) =>
  new Promise((resolve, reject) => {
    socket.emit("room.join", { watchSpaceId }, (response) => {
      if (!response?.success) {
        reject(new Error(`${label} room join failed: ${response?.message}`));
        return;
      }

      console.log(`PASS: ${label} joined WatchSpace`);
      resolve();
    });
  });

const emitWithAck = (socket, event, payload) =>
  new Promise((resolve, reject) => {
    socket.emit(event, payload, (response) => {
      if (!response?.success) {
        reject(new Error(response?.message || `${event} failed`));
        return;
      }

      resolve(response);
    });
  });

const waitForCorrection = () =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Correction event was not received within 5 seconds"));
    }, 5000);

    viewerSocket.once("room.sync.correction", (event) => {
      clearTimeout(timeout);
      resolve(event);
    });
  });

const runTest = async () => {
  try {
    await connectDB();
    console.log("PASS: Test MongoDB connected");

    await Promise.all([
      connectSocket(hostSocket, "Host"),
      connectSocket(viewerSocket, "Viewer"),
    ]);

    await joinRoom(hostSocket, "Host");
    await joinRoom(viewerSocket, "Viewer");

    const controlResponse = await emitWithAck(hostSocket, "playback.control", {
      watchSpaceId,
      action: "play",
      positionSeconds: 125.5,
    });

    console.log("PASS: Host started playback");

    const hostReport = await emitWithAck(hostSocket, "room.sync.report", {
      watchSpaceId,
      positionSeconds: 125.5,
    });

    if (hostReport.role !== "host") {
      throw new Error("Host role validation failed");
    }

    console.log("PASS: Host position reported");

    const correctionPromise = waitForCorrection();

    const viewerReport = await emitWithAck(viewerSocket, "room.sync.report", {
      watchSpaceId,
      positionSeconds: 124.8,
    });

    if (viewerReport.role !== "viewer") {
      throw new Error("Viewer role validation failed");
    }

    console.log("PASS: Viewer position reported");

    const correction = await correctionPromise;
    const payload = correction?.payload;

    if (
      correction?.event !== "room.sync.correction" ||
      correction?.watchSpaceId !== watchSpaceId ||
      typeof payload?.targetPositionSeconds !== "number" ||
      typeof payload?.driftSeconds !== "number" ||
      Math.abs(payload.driftSeconds) <= 0.25
    ) {
      throw new Error(
        `Invalid drift correction response: ${JSON.stringify(correction)}`,
      );
    }

    console.log("PASS: Viewer received drift correction");
    console.log("PASS: Drift threshold validated");
    console.log("Correction target:", payload.targetPositionSeconds);
    console.log("Drift seconds:", payload.driftSeconds);

    console.log("PASS: Playback drift test completed");

    await finish(true);
  } catch (error) {
    console.error("FAIL:", error.message);
    await finish(false);
  }
};

runTest();
