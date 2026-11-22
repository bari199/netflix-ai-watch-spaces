import mongoose from "mongoose";
import Title from "../models/Title.js";
import WatchSpace from "../models/WatchSpace.js";
import { recordPlaybackProgress } from "../services/interaction.service.js";
import {
  closeExpiredAutomaticVote,
  triggerDueAutomaticVariationVote,
} from "./variation.socket.js";

// Playback synchronization configuration
const DRIFT_THRESHOLD_SECONDS = 0.25;
const HOST_POSITION_MAX_AGE_MS = 2000;

// Stores the latest authoritative host position per WatchSpace.
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
  if (!mongoose.isValidObjectId(String(watchSpaceId))) return;

  if (!Number.isFinite(currentPosition) || currentPosition < 0) return;

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

  if (dueEvents.length === 0) return;

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

    if (previousPosition === null || previousPosition === undefined) {
      return;
    }

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
      watchSpaceId: watchSpaceId.toString(),
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

export const applyDueClosedVariation = async (io, watchSpaceId, currentPosition) => {
  if (!Number.isFinite(currentPosition) || currentPosition < 0) return;

  try {
    const watchSpace = await WatchSpace.findOneAndUpdate(
      {
        _id: watchSpaceId,
        "activeVote.status": "closed",
        "activeVote.appliedAt": null,
        $expr: { $lte: ["$activeVote.applyAtSeconds", currentPosition] },
      },
      {
        $set: {
          "activeVote.status": "applied",
          "activeVote.appliedAt": new Date(),
        },
      },
      { new: true },
    );

    if (!watchSpace?.activeVote) return;

    const vote = watchSpace.activeVote;
    io.to(`watchspace:${watchSpaceId}`).emit("room.variation.applied", {
      watchSpaceId: watchSpaceId.toString(),
      variationId: vote.variationId,
      winningOptionId: vote.winningOptionId,
      applyAtSeconds: vote.applyAtSeconds,
      appliedAt: vote.appliedAt,
    });
  } catch (error) {
    console.error("Due variation recovery error:", error);
  }
};

const registerPlaybackHandlers = (io, socket) => {
  const progressTrackers = new Map();

  const PROGRESS_PERSIST_INTERVAL_MS = 15000;
  const PROGRESS_RETRY_INTERVAL_MS = 5000;
  const MAX_REPORT_INTERVAL_SECONDS = 5;
  const MAX_POSITION_DRIFT_SECONDS = 1.5;
  const MAX_PENDING_PROGRESS_SECONDS = 30;

  const getUserId = () => socket.user?._id?.toString();

  const getTrackerKey = (watchSpaceId) => `${watchSpaceId}:${getUserId()}`;

  const getValidatedTitleDuration = async (watchSpace) => {
    const titleId = watchSpace.title?._id || watchSpace.title;

    const title = await Title.findById(titleId).select("duration");

    if (
      !title ||
      typeof title.duration !== "number" ||
      !Number.isFinite(title.duration) ||
      title.duration <= 0
    ) {
      throw new Error("Valid title duration not found");
    }

    return title.duration;
  };

  const validatePosition = (positionSeconds, durationSeconds) => {
    if (
      typeof positionSeconds !== "number" ||
      !Number.isFinite(positionSeconds) ||
      positionSeconds < 0 ||
      positionSeconds > durationSeconds
    ) {
      throw new Error("Invalid playback position");
    }
  };

  // A tracker can have only one database flush in flight at a time.
  const flushProgressTracker = async (
    watchSpaceId,
    watchSpace,
    { force = false } = {},
  ) => {
    const trackerKey = getTrackerKey(watchSpaceId);
    const tracker = progressTrackers.get(trackerKey);

    if (!tracker) return true;
    if (tracker.pendingSeconds <= 0) return true;

    if (tracker.flushPromise) {
      return tracker.flushPromise;
    }

    const now = Date.now();

    if (!force && now - tracker.lastAttemptAt < PROGRESS_RETRY_INTERVAL_MS) {
      return false;
    }

    if (
      force &&
      tracker.lastAttemptAt > 0 &&
      now - tracker.lastAttemptAt < PROGRESS_RETRY_INTERVAL_MS
    ) {
      return false;
    }

    const secondsToSave = Math.min(
      tracker.pendingSeconds,
      MAX_PENDING_PROGRESS_SECONDS,
    );

    const positionSnapshot = tracker.lastPositionSeconds;
    const titleId = watchSpace.title?._id || watchSpace.title;

    tracker.lastAttemptAt = now;

    tracker.flushPromise = (async () => {
      try {
        await recordPlaybackProgress({
          userId: getUserId(),
          titleId,
          watchSpaceId,
          watchedSeconds: secondsToSave,
          positionSeconds: positionSnapshot,
        });

        tracker.pendingSeconds = Math.max(
          0,
          tracker.pendingSeconds - secondsToSave,
        );

        tracker.lastPersistAt = Date.now();

        return true;
      } catch (error) {
        console.error("[INTERACTION SAVE ERROR]", {
          message: error.message,
          stack: error.stack,
          userId: tracker.userId,
          titleId: tracker.titleId,
          watchSpaceId: tracker.watchSpaceId,
          pendingSeconds: tracker.pendingSeconds,
        });

        // Existing retry and pending-progress handling রাখবে।
      } finally {
        tracker.flushPromise = null;
      }
    })();

    return tracker.flushPromise;
  };

  const flushAndCleanupTracker = async (watchSpaceId, watchSpace) => {
    const trackerKey = getTrackerKey(watchSpaceId);

    const flushed = await flushProgressTracker(watchSpaceId, watchSpace, {
      force: true,
    });

    const tracker = progressTrackers.get(trackerKey);

    if (flushed && tracker && tracker.pendingSeconds <= 0) {
      progressTrackers.delete(trackerKey);
    }

    return flushed;
  };

  socket.on("room.playback.mode.update", async (data = {}, callback) => {
    try {
      const { watchSpaceId, mode } = data;
      if (!mongoose.isValidObjectId(watchSpaceId)) {
        throw new Error("Invalid WatchSpace ID");
      }
      if (!["manual", "automatic"].includes(mode)) {
        throw new Error("Invalid playback mode");
      }
      const roomName = `watchspace:${watchSpaceId}`;
      if (!socket.rooms.has(roomName)) {
        throw new Error("You are not connected to this WatchSpace");
      }

      const watchSpace = await WatchSpace.findById(watchSpaceId);
      if (!watchSpace) throw new Error("WatchSpace not found");
      if (watchSpace.status === "ended") {
        throw new Error("This WatchSpace has already ended");
      }
      if (watchSpace.host.toString() !== getUserId()) {
        throw new Error("Only the host can change playback mode");
      }
      if (
        watchSpace.activeVote &&
        ["open", "closed"].includes(watchSpace.activeVote.status)
      ) {
        throw new Error("Finish the current story vote before changing mode");
      }

      watchSpace.playbackMode = mode;
      await watchSpace.save();

      if (typeof callback === "function") {
        callback({ success: true, playbackMode: mode });
      }

      io.to(roomName).emit("room.playback.mode.changed", {
        watchSpaceId: watchSpaceId.toString(),
        mode,
        updatedBy: getUserId(),
      });

    } catch (error) {
      if (typeof callback === "function") {
        callback({ success: false, message: error.message });
      }
    }
  });

  socket.on("playback.control", async (data, callback) => {
    try {
      const { watchSpaceId, action, positionSeconds } = data || {};

      if (!mongoose.isValidObjectId(watchSpaceId)) {
        throw new Error("Invalid WatchSpace ID");
      }

      const allowedActions = ["play", "pause", "seek", "buffering"];

      if (!allowedActions.includes(action)) {
        throw new Error("Invalid playback action");
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

      if (watchSpace.host.toString() !== getUserId()) {
        throw new Error("Only the WatchSpace host can control playback");
      }

      const durationSeconds = await getValidatedTitleDuration(watchSpace);

      validatePosition(positionSeconds, durationSeconds);

      if (action === "pause" || action === "buffering") {
        await flushAndCleanupTracker(watchSpaceId, watchSpace);
      }

      const previousPlaybackPosition = watchSpace.playback.positionSeconds;

     if (action === "play") {
       watchSpace.playback.state = "playing";

       // Record the first playback start time only once.
       if (!watchSpace.startedAt) {
         watchSpace.startedAt = new Date();
       }

       if (watchSpace.status === "waiting") {
         watchSpace.status = "active";
       }
     } else if (action === "pause") {
       watchSpace.playback.state = "paused";
     } else if (action === "buffering") {
       watchSpace.playback.state = "buffering";
     }

      // Seek changes position but preserves the current play/pause state.
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

      const receivedAt = Date.now();

      hostPlaybackPositions.set(watchSpaceId.toString(), {
        positionSeconds,
        receivedAt,
        state: watchSpace.playback.state,
      });

      const eventPayload = {
        event: "room.playback.update",
        watchSpaceId: watchSpaceId.toString(),
        payload: {
          state: action,
          positionSeconds,
          issuedBy: getUserId(),
        },
        ts: receivedAt,
      };

      io.to(roomName).emit("room.playback.update", eventPayload);

      if (typeof callback === "function") {
        callback({
          success: true,
          message: "Playback updated successfully",
          ...eventPayload,
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

      const durationSeconds = await getValidatedTitleDuration(watchSpace);

      validatePosition(positionSeconds, durationSeconds);

      const isHost = watchSpace.host.toString() === getUserId();

      const receivedAt = Date.now();

      let previousHostPosition = null;

      // Track individual user's playback progress.
      const trackerKey = getTrackerKey(watchSpaceId);
      let tracker = progressTrackers.get(trackerKey);

      const isPlaying = watchSpace.playback.state === "playing";

      if (!isPlaying) {
        if (tracker) {
          await flushAndCleanupTracker(watchSpaceId, watchSpace);
        }
      } else if (!tracker) {
        progressTrackers.set(trackerKey, {
          lastPositionSeconds: positionSeconds,
          lastReportAt: receivedAt,
          lastPersistAt: receivedAt,
          lastAttemptAt: 0,
          pendingSeconds: 0,
          flushPromise: null,
        });
      } else {
        const elapsedSeconds = (receivedAt - tracker.lastReportAt) / 1000;

        const positionDelta = positionSeconds - tracker.lastPositionSeconds;

        // Count only plausible forward movement.
        if (
          elapsedSeconds > 0 &&
          elapsedSeconds <= MAX_REPORT_INTERVAL_SECONDS &&
          positionDelta >= 0 &&
          Math.abs(positionDelta - elapsedSeconds) <= MAX_POSITION_DRIFT_SECONDS
        ) {
          tracker.pendingSeconds = Math.min(
            MAX_PENDING_PROGRESS_SECONDS,
            tracker.pendingSeconds + Math.min(elapsedSeconds, positionDelta),
          );
        }

        // Update baseline even when a jump is rejected.
        tracker.lastPositionSeconds = positionSeconds;
        tracker.lastReportAt = receivedAt;

        if (
          tracker.pendingSeconds > 0 &&
          receivedAt - tracker.lastPersistAt >= PROGRESS_PERSIST_INTERVAL_MS
        ) {
          await flushProgressTracker(watchSpaceId, watchSpace);
        }
      }

      // Only the Host can update the authoritative playback position.
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

        // Automatic story voting is server-authoritative and starts only
        // when the host's playing timeline crosses a variation marker.
        await closeExpiredAutomaticVote(io, watchSpaceId.toString());
        await triggerDueAutomaticVariationVote(
          io,
          watchSpaceId.toString(),
          previousHostPosition,
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

        // Recover closed votes when the timeline marker is reached on a
        // fresh server process or after the host reconnects.
        await applyDueClosedVariation(
          io,
          watchSpaceId.toString(),
          positionSeconds,
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

        if (reportAgeMs >= 0 && reportAgeMs <= HOST_POSITION_MAX_AGE_MS) {
          estimatedHostPosition =
            hostPosition.positionSeconds +
            (hostPosition.state === "playing" ? reportAgeMs / 1000 : 0);
        }
      }

      // Calculate playback drift for viewers.
      let driftSeconds = null;

      if (!isHost && estimatedHostPosition !== null) {
        driftSeconds = estimatedHostPosition - positionSeconds;

        if (Math.abs(driftSeconds) > DRIFT_THRESHOLD_SECONDS) {
          socket.emit("room.sync.correction", {
            event: "room.sync.correction",
            watchSpaceId: watchSpaceId.toString(),
            payload: {
              targetPositionSeconds: estimatedHostPosition,
              driftSeconds,
              issuedBy: watchSpace.host.toString(),
            },
            ts: Date.now(),
          });
        }
      }

      const response = {
        success: true,
        message: "Playback position received",
        watchSpaceId: watchSpaceId.toString(),
        userId: getUserId(),
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
      const userId = getUserId();

      if (!userId) return;

      for (const roomName of socket.rooms) {
        if (!roomName.startsWith("watchspace:")) continue;

        const watchSpaceId = roomName.slice("watchspace:".length);

        if (!mongoose.isValidObjectId(watchSpaceId)) {
          continue;
        }

        const watchSpace = await WatchSpace.findById(watchSpaceId);

        if (!watchSpace) continue;

        // Attempt a final save for pending progress.
        await flushAndCleanupTracker(watchSpaceId, watchSpace);

        if (watchSpace.status === "ended") {
          continue;
        }

        // Only the current Host's disconnection should pause playback.
        if (watchSpace.host.toString() !== userId) {
          continue;
        }

        // Check whether another Host socket is still connected.
        const connectedSockets = await io.in(roomName).fetchSockets();

        const anotherHostSocketExists = connectedSockets.some(
          (connectedSocket) =>
            connectedSocket.id !== socket.id &&
            connectedSocket.data.userId === userId,
        );

        if (anotherHostSocketExists) {
          continue;
        }

        // Preserve the latest known playback position.
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

        // Notify remaining WatchSpace participants.
        io.to(roomName).emit("room.playback.update", {
          event: "room.playback.update",
          watchSpaceId,
          payload: {
            state: "pause",
            positionSeconds: watchSpace.playback.positionSeconds,
            issuedBy: userId,
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

export default registerPlaybackHandlers;
