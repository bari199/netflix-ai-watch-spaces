import dotenv from "dotenv";
import { io as createSocket } from "socket.io-client";
import mongoose from "mongoose";
import connectDB from "../src/config/db.js";
import WatchSpace from "../src/models/WatchSpace.js";

dotenv.config({ path: "../.env" });

const HOST_TOKEN = process.env.HOST_SOCKET_TEST_TOKEN;
const VIEWER_TOKEN = process.env.VIEWER_SOCKET_TEST_TOKEN;

const WATCH_SPACE_ID = "6af20bef2ce49f8c669bc91f";

const SERVER_URL = "http://localhost:5000";
const HOST_POSITION = 200;

const waitForEvent = (socket, eventName, timeout = 5000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, handler);
      reject(new Error(`${eventName} event timeout`));
    }, timeout);

    const handler = (data) => {
      clearTimeout(timer);
      resolve(data);
    };

    socket.once(eventName, handler);
  });

const connectSocket = (token) =>
  new Promise((resolve, reject) => {
    const socket = createSocket(SERVER_URL, {
      auth: { token },
      reconnection: false,
    });

    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", reject);
  });

const joinRoom = (socket) =>
  new Promise((resolve, reject) => {
    socket.emit("room.join", { watchSpaceId: WATCH_SPACE_ID }, (response) => {
      if (!response?.success) {
        return reject(new Error(response?.message || "Room join failed"));
      }

      resolve(response);
    });
  });

const playbackControl = (socket, action, positionSeconds) =>
  new Promise((resolve, reject) => {
    socket.emit(
      "playback.control",
      { watchSpaceId: WATCH_SPACE_ID, action, positionSeconds },
      (response) => {
        if (!response?.success) {
          return reject(
            new Error(response?.message || "Playback control failed"),
          );
        }

        resolve(response);
      },
    );
  });

const reportPosition = (socket, positionSeconds) =>
  new Promise((resolve, reject) => {
    socket.emit(
      "room.sync.report",
      { watchSpaceId: WATCH_SPACE_ID, positionSeconds },
      (response) => {
        if (!response?.success) {
          return reject(
            new Error(response?.message || "Position report failed"),
          );
        }

        resolve(response);
      },
    );
  });

let hostSocket;
let viewerSocket;

try {
  if (!HOST_TOKEN || !VIEWER_TOKEN) {
    throw new Error("Host or Viewer test token missing from .env");
  }

  await connectDB();
  console.log("PASS: MongoDB connected");

  hostSocket = await connectSocket(HOST_TOKEN);
  console.log("PASS: Host socket connected");

  viewerSocket = await connectSocket(VIEWER_TOKEN);
  console.log("PASS: Viewer socket connected");

  await joinRoom(hostSocket);
  console.log("PASS: Host joined WatchSpace");

  await joinRoom(viewerSocket);
  console.log("PASS: Viewer joined WatchSpace");

  await playbackControl(hostSocket, "play", HOST_POSITION);
  console.log("PASS: Host started playback");

  await reportPosition(hostSocket, HOST_POSITION);
  console.log("PASS: Host position reported");

  const disconnectUpdatePromise = waitForEvent(
    viewerSocket,
    "room.playback.update",
  );

  hostSocket.disconnect();
  console.log("PASS: Host disconnected");

  const update = await disconnectUpdatePromise;

  if (
    update?.payload?.state !== "pause" ||
    update?.payload?.reason !== "host_disconnected"
  ) {
    throw new Error("Expected Host disconnect pause update");
  }

  console.log("PASS: Viewer received Host disconnect pause update");

  const watchSpace = await WatchSpace.findById(WATCH_SPACE_ID);

  if (watchSpace.playback.state !== "paused") {
    throw new Error("Database playback state is not paused");
  }

  if (watchSpace.playback.positionSeconds !== HOST_POSITION) {
    throw new Error("Playback position was not preserved");
  }

  console.log("PASS: Database playback state is paused");
  console.log("PASS: Last playback position preserved");
  console.log("PASS: Host disconnect test completed");
} catch (error) {
  console.error("FAIL:", error.message);
  process.exitCode = 1;
} finally {
  hostSocket?.disconnect();
  viewerSocket?.disconnect();

  await mongoose.disconnect();
}
