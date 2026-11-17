import mongoose from "mongoose";
import Title from "../models/Title.js";
import WatchSpace from "../models/WatchSpace.js";

// Playback synchronization configuration
const DRIFT_THRESHOLD_SECONDS = 0.25;
const HOST_POSITION_MAX_AGE_MS = 2000;

// Stores the latest authoritative host position per WatchSpace
const hostPlaybackPositions = new Map();
const triggeredTriviaByWatchSpace = new Map();

const getCanonicalTriviaText = (event) => {
  if (typeof event?.text === "string" && event.text.trim()) {
    return event.text.trim();
  }

  if (typeof event?.description === "string" && event.description.trim()) {
    return event.description.trim();
  }

  return "";
};

export const triggerDueTriviaEvents = async (
  io,
  watchSpaceId,
  previousPosition,
  currentPosition,
  watchSpaceOverride,
) => {
  if (!mongoose.isValidObjectId(String(watchSpaceId))) {
    return;
  }

  if (!Number.isFinite(currentPosition) || currentPosition < 0) {
    return;
  }

  if (
    previousPosition !== null &&
    previousPosition !== undefined &&
    !Number.isFinite(previousPosition)
  ) {
    return;
  }

  const targetId = String(watchSpaceId);
  const watchSpace =
    watchSpaceOverride ||
    (await WatchSpace.findById(targetId).populate("title", "timeline"));

  if (
    !watchSpace ||
    watchSpace.status === "ended" ||
    !watchSpace.triviaEnabled
  ) {
    return;
  }

  const titleRecord = Array.isArray(watchSpace.title?.timeline)
    ? watchSpace.title
    : await Title.findById(watchSpace.title).select("timeline");

  const timeline = Array.isArray(titleRecord?.timeline)
    ? titleRecord.timeline
    : [];

  const eligibleEvents = timeline.filter(
    (event) =>
      event &&
      event.eventType === "trivia" &&
      Number.isFinite(Number(event.startTime)) &&
      Number.isFinite(Number(event.endTime)) &&
      Number(event.startTime) >= 0 &&
      Number(event.endTime) >= Number(event.startTime) &&
      typeof event.eventId === "string" &&
      event.eventId.trim() &&
      getCanonicalTriviaText(event),
  );

  const triggered =
    triggeredTriviaByWatchSpace.get(targetId) ||
    new Set(watchSpace.triggeredTriviaEventIds || []);
  const dueEvents = [];

  for (const event of eligibleEvents) {
    const startTime = Number(event.startTime);

    const hasCrossedMarker =
      (previousPosition !== null &&
        previousPosition !== undefined &&
        previousPosition < startTime &&
        currentPosition >= startTime) ||
      (startTime === 0 && previousPosition === 0 && currentPosition === 0);

    if (!hasCrossedMarker || triggered.has(String(event.eventId))) {
      continue;
    }

    triggered.add(String(event.eventId));
    dueEvents.push(event);
  }

  if (dueEvents.length > 0) {
    triggeredTriviaByWatchSpace.set(targetId, triggered);
    watchSpace.triggeredTriviaEventIds = [...triggered];

    try {
      await watchSpace.save();
    } catch (error) {
      for (const event of dueEvents) {
        triggered.delete(String(event.eventId));
      }
      throw error;
    }

    for (const event of dueEvents) {
      io.to(`watchspace:${targetId}`).emit("room.ai.trivia", {
        watchSpaceId: targetId,
        eventId: String(event.eventId),
        eventType: event.eventType,
        startTime: Number(event.startTime),
        endTime: Number(event.endTime),
        text: getCanonicalTriviaText(event),
        triggeredAt: Date.now(),
      });
    }
  }
};

export const applyDueVariation = async (
  io,
  watchSpaceId,
  previousPosition,
  currentPosition,
  playbackState,
) => {
  try {
    if (playbackState !== "playing") return;

    if (previousPosition === null || previousPosition === undefined) return;

    if (currentPosition <= previousPosition) return;

    const watchSpace = await WatchSpace.findOneAndUpdate(
      {
        _id: watchSpaceId,
        "activeVote.status": "closed",
        "activeVote.appliedAt": null,
        $expr: {
          $lte: ["$activeVote.applyAtSeconds", currentPosition],
        },
      },
      {
        $set: {
          "activeVote.status": "applied",
          "activeVote.appliedAt": new Date(),
        },
      },
      { new: true },
    );

    if (!watchSpace) return;

    const vote = watchSpace.activeVote;

    io.to(`watchspace:${watchSpaceId}`).emit("room.variation.applied", {
      variationId: vote.variationId,
      winningOptionId: vote.winningOptionId,
      applyAtSeconds: vote.applyAtSeconds,
      appliedAt: vote.appliedAt,
    });

    console.log(
      `Variation applied: ${vote.variationId} in WatchSpace ${watchSpaceId}`,
    );
  } catch (error) {
    console.error("Variation application error:", error);
  }
};

const registerPlaybackHandlers = (io, socket) => {
  socket.on("playback.control", async (data, callback) => {
    try {
      const { watchSpaceId, action, positionSeconds } = data || {};

      // Validate WatchSpace ID
      if (!mongoose.isValidObjectId(watchSpaceId)) {
        throw new Error("Invalid WatchSpace ID");
      }

      // Validate playback action
      const allowedActions = ["play", "pause", "seek", "buffering"];

      if (!allowedActions.includes(action)) {
        throw new Error("Invalid playback action");
      }

      // Validate playback position
      if (
        typeof positionSeconds !== "number" ||
        !Number.isFinite(positionSeconds) ||
        positionSeconds < 0
      ) {
        throw new Error("Invalid playback position");
      }

      const roomName = `watchspace:${watchSpaceId}`;

      // Verify socket room membership
      if (!socket.rooms.has(roomName)) {
        throw new Error("You are not connected to this WatchSpace");
      }

      const watchSpace = await WatchSpace.findById(watchSpaceId);

      if (!watchSpace) {
        throw new Error("WatchSpace not found");
      }

      if (watchSpace.status === "ended") {
        throw new Error("WatchSpace has already ended");
      }

      // Only the current host can control playback
      if (watchSpace.host.toString() !== socket.user._id.toString()) {
        throw new Error("Only the WatchSpace host can control playback");
      }

      // Update authoritative playback state
      // Update authoritative playback state
      if (action === "play") {
        watchSpace.playback.state = "playing";

        // Activate WatchSpace when Host starts playback
        if (watchSpace.status === "waiting") {
          watchSpace.status = "active";
        }
      } else if (action === "pause") {
        watchSpace.playback.state = "paused";
      } else if (action === "seek") {
        watchSpace.playback.state = "seeking";
      } else if (action === "buffering") {
        watchSpace.playback.state = "buffering";
      }

      const previousPlaybackPosition = watchSpace.playback.positionSeconds;

      watchSpace.playback.positionSeconds = positionSeconds;
      watchSpace.playback.updatedAt = new Date();
      watchSpace.playback.updatedBy = socket.user._id;

      await watchSpace.save();

      await triggerDueTriviaEvents(
        io,
        watchSpaceId,
        previousPlaybackPosition,
        positionSeconds,
        watchSpace,
      );

      // Update authoritative Host position for synchronization
      hostPlaybackPositions.set(watchSpaceId.toString(), {
        positionSeconds,
        receivedAt: Date.now(),
        state: watchSpace.playback.state,
      });

      // Broadcast playback update to all room members
      const eventPayload = {
        event: "room.playback.update",
        watchSpaceId: watchSpaceId.toString(),
        payload: {
          state: action,
          positionSeconds,
          issuedBy: socket.user._id.toString(),
        },
        ts: Date.now(),
      };

      io.to(roomName).emit("room.playback.update", eventPayload);

      const response = {
        success: true,
        message: "Playback updated successfully",
        ...eventPayload,
      };

      if (typeof callback === "function") {
        callback(response);
      }
    } catch (error) {
      const response = {
        success: false,
        message: error.message,
      };

      if (typeof callback === "function") {
        callback(response);
      } else {
        socket.emit("room.error", response);
      }
    }
  });

  socket.on("room.sync.ping", async (data, callback) => {
    try {
      const { watchSpaceId, clientSentAt } = data || {};

      if (!mongoose.isValidObjectId(watchSpaceId)) {
        throw new Error("Invalid WatchSpace ID");
      }

      if (typeof clientSentAt !== "number" || !Number.isFinite(clientSentAt)) {
        throw new Error("Invalid client timestamp");
      }

      const roomName = `watchspace:${watchSpaceId}`;

      if (!socket.rooms.has(roomName)) {
        throw new Error("You are not connected to this WatchSpace");
      }

      const watchSpace = await WatchSpace.findById(watchSpaceId);

      if (!watchSpace) {
        throw new Error("WatchSpace not found");
      }

      if (watchSpace.status === "ended") {
        throw new Error("WatchSpace has already ended");
      }

      const serverReceivedAt = Date.now();

      const response = {
        event: "room.sync.pong",
        watchSpaceId: watchSpaceId.toString(),
        payload: {
          clientSentAt,
          serverReceivedAt,
        },
        ts: Date.now(),
      };

      socket.emit("room.sync.pong", response);

      if (typeof callback === "function") {
        callback({
          success: true,
          ...response,
        });
      }
    } catch (error) {
      const response = {
        success: false,
        message: error.message,
      };

      if (typeof callback === "function") {
        callback(response);
      } else {
        socket.emit("room.error", response);
      }
    }
  });

  socket.on("room.sync.report", async (data, callback) => {
    try {
      const { watchSpaceId, positionSeconds } = data || {};

      if (!mongoose.isValidObjectId(watchSpaceId)) {
        throw new Error("Invalid WatchSpace ID");
      }

      if (
        typeof positionSeconds !== "number" ||
        !Number.isFinite(positionSeconds) ||
        positionSeconds < 0
      ) {
        throw new Error("Invalid playback position");
      }

      const roomName = `watchspace:${watchSpaceId}`;

      if (!socket.rooms.has(roomName)) {
        throw new Error("You are not connected to this WatchSpace");
      }

      const watchSpace = await WatchSpace.findById(watchSpaceId);

      if (!watchSpace) {
        throw new Error("WatchSpace not found");
      }

      if (watchSpace.status === "ended") {
        throw new Error("WatchSpace has already ended");
      }

      const isHost = watchSpace.host.toString() === socket.user._id.toString();

      const receivedAt = Date.now();

      let previousHostPosition = null;

      // Only the Host can update the authoritative playback position
      if (isHost) {
        previousHostPosition =
          hostPlaybackPositions.get(watchSpaceId.toString())?.positionSeconds ??
          watchSpace.playback.positionSeconds;

        const previousPlaybackPosition = watchSpace.playback.positionSeconds;
        watchSpace.playback.positionSeconds = positionSeconds;
        watchSpace.playback.updatedAt = new Date();
        watchSpace.playback.updatedBy = socket.user._id;

        await watchSpace.save();
        await triggerDueTriviaEvents(
          io,
          watchSpaceId,
          previousPlaybackPosition,
          positionSeconds,
          watchSpace,
        );

        hostPlaybackPositions.set(watchSpaceId.toString(), {
          positionSeconds,
          receivedAt,
          state: watchSpace.playback.state,
        });
        io.to(roomName).emit("room.playback.position", {
          watchSpaceId: watchSpaceId.toString(),
          positionSeconds,
          updatedAt: receivedAt,
        });
      }

      if (isHost) {
        await applyDueVariation(
          io,
          watchSpaceId.toString(),
          previousHostPosition,
          positionSeconds,
          watchSpace.playback.state,
        );

        hostPlaybackPositions.set(watchSpaceId.toString(), {
          positionSeconds,
          receivedAt,
          state: watchSpace.playback.state,
        });
      }

      const hostPosition = hostPlaybackPositions.get(watchSpaceId.toString());

      let estimatedHostPosition = null;

      if (hostPosition) {
        const reportAgeMs = receivedAt - hostPosition.receivedAt;

        if (reportAgeMs <= HOST_POSITION_MAX_AGE_MS) {
          estimatedHostPosition =
            hostPosition.positionSeconds +
            (hostPosition.state === "playing" ? reportAgeMs / 1000 : 0);
        }
      }

      // Calculate playback drift for viewers
      let driftSeconds = null;

      if (!isHost && estimatedHostPosition !== null) {
        driftSeconds = estimatedHostPosition - positionSeconds;

        // Send correction only when drift exceeds 250ms
        if (Math.abs(driftSeconds) > DRIFT_THRESHOLD_SECONDS) {
          const correctionPayload = {
            event: "room.sync.correction",
            watchSpaceId: watchSpaceId.toString(),
            payload: {
              targetPositionSeconds: estimatedHostPosition,
              driftSeconds,
              issuedBy: watchSpace.host.toString(),
            },
            ts: Date.now(),
          };

          socket.emit("room.sync.correction", correctionPayload);
        }
      }

      const response = {
        success: true,
        message: "Playback position received",
        watchSpaceId,
        userId: socket.user._id.toString(),
        role: isHost ? "host" : "viewer",
        positionSeconds,
        receivedAt: Date.now(),
        estimatedHostPosition,
      };

      if (typeof callback === "function") {
        callback(response);
      }
    } catch (error) {
      const response = {
        success: false,
        message: error.message,
      };

      if (typeof callback === "function") {
        callback(response);
      } else {
        socket.emit("room.error", response);
      }
    }
  });

  socket.on("disconnecting", async () => {
    try {
      const hostId = socket.data.userId;

      if (!hostId) return;

      for (const roomName of socket.rooms) {
        if (!roomName.startsWith("watchspace:")) continue;

        const watchSpaceId = roomName.replace("watchspace:", "");

        if (!mongoose.isValidObjectId(watchSpaceId)) continue;

        const watchSpace = await WatchSpace.findById(watchSpaceId);

        if (!watchSpace || watchSpace.status === "ended") continue;

        // Only handle the current Host's disconnection
        if (watchSpace.host.toString() !== hostId) continue;

        // Check whether another Host socket is still connected
        const connectedSockets = await io.in(roomName).fetchSockets();

        const anotherHostSocketExists = connectedSockets.some(
          (connectedSocket) =>
            connectedSocket.id !== socket.id &&
            connectedSocket.data.userId === hostId,
        );

        if (anotherHostSocketExists) continue;

        // Preserve the latest known playback position
        const hostPosition = hostPlaybackPositions.get(watchSpaceId);

        if (
          hostPosition &&
          Date.now() - hostPosition.receivedAt <= HOST_POSITION_MAX_AGE_MS
        ) {
          watchSpace.playback.positionSeconds = hostPosition.positionSeconds;
        }

        watchSpace.playback.state = "paused";
        watchSpace.playback.updatedAt = new Date();
        watchSpace.playback.updatedBy = socket.user._id;

        await watchSpace.save();

        hostPlaybackPositions.set(watchSpaceId, {
          positionSeconds: watchSpace.playback.positionSeconds,
          receivedAt: Date.now(),
          state: "paused",
        });

        // Notify remaining WatchSpace participants
        io.to(roomName).emit("room.playback.update", {
          event: "room.playback.update",
          watchSpaceId,
          payload: {
            state: "pause",
            positionSeconds: watchSpace.playback.positionSeconds,
            issuedBy: hostId,
            reason: "host_disconnected",
          },
          ts: Date.now(),
        });

        console.log(`Host disconnected. Playback paused: ${watchSpaceId}`);
      }
    } catch (error) {
      console.error("Host disconnect handling failed:", error.message);
    }
  });
};

// Handle Host disconnection

export default registerPlaybackHandlers;
