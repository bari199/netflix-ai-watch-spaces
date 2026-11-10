import dotenv from "dotenv";
import { io } from "socket.io-client";
import mongoose from "mongoose";
import connectDB from "../src/config/db.js";

dotenv.config({ path: "../.env" });

const hostToken = process.env.HOST_SOCKET_TEST_TOKEN;
const viewerToken = process.env.VIEWER_SOCKET_TEST_TOKEN;
const watchSpaceId = "6af20bef2ce49f8c669bc91f";

const HOST_POSITION = 200;
const VIEWER_POSITION = 199;

if (!hostToken || !viewerToken) {
  console.error("FAIL: Host or Viewer token is missing");
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

const joinRoom = (socket, label) =>
  emitWithAck(socket, "room.join", { watchSpaceId }).then(() => {
    console.log(`PASS: ${label} joined WatchSpace`);
  });

const waitForPlaybackUpdate = (expectedState) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`${expectedState} update was not received`));
    }, 5000);

    const handler = (event) => {
      if (event?.payload?.state !== expectedState) return;

      clearTimeout(timeout);
      resolve(event);
    };

    viewerSocket.on("room.playback.update", handler);
  });

const waitForCorrection = () =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Recovery correction was not received"));
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

    // First enter buffering state
    await emitWithAck(hostSocket, "playback.control", {
      watchSpaceId,
      action: "buffering",
      positionSeconds: HOST_POSITION,
    });

    console.log("PASS: Host entered buffering state");

    await emitWithAck(hostSocket, "room.sync.report", {
      watchSpaceId,
      positionSeconds: HOST_POSITION,
    });

    console.log("PASS: Host buffering position reported");

    // Recover from buffering to playing
    const playingUpdatePromise = waitForPlaybackUpdate("play");

    await emitWithAck(hostSocket, "playback.control", {
      watchSpaceId,
      action: "play",
      positionSeconds: HOST_POSITION,
    });

    const playingUpdate = await playingUpdatePromise;

    if (playingUpdate?.payload?.state !== "play") {
      throw new Error("Host did not recover to play state");
    }

    console.log("PASS: Host recovered to play state");
    console.log("PASS: Viewer received play update");

    await emitWithAck(hostSocket, "room.sync.report", {
      watchSpaceId,
      positionSeconds: HOST_POSITION,
    });

    console.log("PASS: Host recovery position reported");

    const correctionPromise = waitForCorrection();

    await emitWithAck(viewerSocket, "room.sync.report", {
      watchSpaceId,
      positionSeconds: VIEWER_POSITION,
    });

    console.log("PASS: Viewer position reported");

    const correction = await correctionPromise;
    const payload = correction?.payload;

    if (
      correction?.event !== "room.sync.correction" ||
      typeof payload?.targetPositionSeconds !== "number" ||
      payload.targetPositionSeconds < HOST_POSITION ||
      Math.abs(payload.driftSeconds) <= 0.25
    ) {
      throw new Error(
        `Invalid recovery correction: ${JSON.stringify(correction)}`,
      );
    }

    console.log("PASS: Viewer received recovery correction");
    console.log("Correction target:", payload.targetPositionSeconds);
    console.log("Drift seconds:", payload.driftSeconds);
    console.log("PASS: Buffering recovery test completed");

    await finish(true);
  } catch (error) {
    console.error("FAIL:", error.message);
    await finish(false);
  }
};

runTest();
