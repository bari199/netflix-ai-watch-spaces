import { randomBytes } from "node:crypto";
import WatchSpace from "../models/WatchSpace.js";

export const createWatchSpace = async (
  titleId,
  hostId,
  isPrivate = false,
  maxParticipants = 50,
  aiVerbosity = "normal",
  votingEnabled = true,
  triviaEnabled = true,
  scheduledAt = null,
) => {
  const inviteCode = isPrivate ? randomBytes(6).toString("hex") : null;

  const watchSpace = await WatchSpace.create({
    title: titleId,
    host: hostId,
    maxParticipants,
    participants: [
      {
        user: hostId,
        role: "host",
      },
    ],
    isPrivate,
    inviteCode,
    aiVerbosity,
    triviaEnabled,
    votingEnabled,
    startedAt: null,
    endedAt: null,
    peakParticipants: 1,
    status: scheduledAt ? "scheduled" : "waiting",
    scheduledAt,
  });

  return watchSpace;
};

export const getWatchSpaceById = async (watchSpaceId, userId) => {
  const watchSpace = await WatchSpace.findById(watchSpaceId)
    .populate(
      "title",
      "name description duration thumbnailKey timeline subtitleVariants.variantId subtitleVariants.locale subtitleVariants.label subtitleVariants.eventId subtitleVariants.variationId subtitleVariants.optionId",
    )
    .populate("host", "name avatar")
    .populate("participants.user", "name avatar");

  if (!watchSpace) {
    throw new Error("WatchSpace not found");
  }

  if (watchSpace.isPrivate) {
    const isHost = watchSpace.host._id.toString() === userId.toString();

    const isParticipant = watchSpace.participants.some(
      (participant) => participant.user._id.toString() === userId.toString(),
    );

    if (!isHost && !isParticipant) {
      throw new Error("You are not authorized to access this WatchSpace");
    }
  }

  return watchSpace;
};

export const getActiveWatchSpaces = async () => {
  return WatchSpace.find({
    status: { $in: ["waiting", "active"] },
    isPrivate: false,
  })
    .populate("title", "name duration thumbnailKey")
    .populate("host", "name avatar")
    .sort({ createdAt: -1 });
};

export const joinWatchSpace = async (watchSpaceId, userId, inviteCode) => {
  const watchSpace = await WatchSpace.findById(watchSpaceId);

  if (!watchSpace) {
    throw new Error("WatchSpace not found");
  }

  if (watchSpace.status === "ended") {
    throw new Error("This WatchSpace has already ended");
  }

  const alreadyJoined = watchSpace.participants.some(
    (participant) => participant.user.toString() === userId.toString(),
  );

  // Existing participants can rejoin without being blocked by room lock.
  if (!alreadyJoined) {
    if (watchSpace.isLocked) {
      throw new Error("This WatchSpace is locked");
    }

    if (watchSpace.isPrivate && watchSpace.inviteCode !== inviteCode) {
      throw new Error("Invalid invite code");
    }

    if (watchSpace.participants.length >= watchSpace.maxParticipants) {
      throw new Error("WatchSpace has reached its participant limit");
    }

    watchSpace.participants.push({
      user: userId,
      role: "viewer",
    });

    // Update historical peak participant count.
    watchSpace.peakParticipants = Math.max(
      watchSpace.peakParticipants || 0,
      watchSpace.participants.length,
    );

    await watchSpace.save();
  }

  const savedWatchSpace =
    await WatchSpace.findById(watchSpaceId).select("status endedAt");

  console.log("[DEBUG] EndWatchSpace persisted:", {
    status: savedWatchSpace?.status,
    endedAt: savedWatchSpace?.endedAt,
  });
  return savedWatchSpace;
};

export const leaveWatchSpace = async (watchSpaceId, userId) => {
  const watchSpace = await WatchSpace.findById(watchSpaceId);

  if (!watchSpace) {
    throw new Error("WatchSpace not found");
  }

  if (watchSpace.host.toString() === userId.toString()) {
    throw new Error("Host cannot leave the WatchSpace. End it instead.");
  }

  watchSpace.participants = watchSpace.participants.filter(
    (participant) => participant.user.toString() !== userId.toString(),
  );

  await watchSpace.save();

  return watchSpace;
};

export const endWatchSpace = async (watchSpaceId, hostId) => {
  const watchSpace = await WatchSpace.findById(watchSpaceId);

  if (!watchSpace) {
    throw new Error("WatchSpace not found");
  }

  if (watchSpace.host.toString() !== hostId.toString()) {
    throw new Error("Only the host can end this WatchSpace");
  }

  watchSpace.status = "ended";
  watchSpace.endedAt = new Date();

  await watchSpace.save();

  return watchSpace;
};

// Host: Mute or unmute a participant.
export const setParticipantMute = async (
  watchSpaceId,
  hostId,
  participantId,
  isMuted,
) => {
  const watchSpace = await WatchSpace.findById(watchSpaceId);

  if (!watchSpace) {
    throw new Error("WatchSpace not found");
  }

  if (watchSpace.host.toString() !== hostId.toString()) {
    throw new Error("Only the host can mute or unmute participants");
  }

  if (watchSpace.status === "ended") {
    throw new Error("This WatchSpace has already ended");
  }

  const participant = watchSpace.participants.find(
    (p) => p.user.toString() === participantId.toString(),
  );

  if (!participant) {
    throw new Error("Participant not found in this WatchSpace");
  }

  if (participant.role === "host") {
    throw new Error("Host cannot be muted");
  }

  participant.isMuted = isMuted;

  await watchSpace.save();

  return watchSpace;
};

export const removeParticipant = async (
  watchSpaceId,
  hostId,
  participantId,
) => {
  const watchSpace = await WatchSpace.findById(watchSpaceId);

  if (!watchSpace) {
    throw new Error("WatchSpace not found");
  }

  if (watchSpace.host.toString() !== hostId.toString()) {
    throw new Error("Only the host can remove participants");
  }

  if (watchSpace.status === "ended") {
    throw new Error("This WatchSpace has already ended");
  }

  const participant = watchSpace.participants.find(
    (p) => p.user.toString() === participantId.toString(),
  );

  if (!participant) {
    throw new Error("Participant not found in this WatchSpace");
  }

  if (participant.role === "host") {
    throw new Error("Host cannot remove themselves");
  }

  watchSpace.participants = watchSpace.participants.filter(
    (p) => p.user.toString() !== participantId.toString(),
  );

  await watchSpace.save();

  return watchSpace;
};

export const setPlaybackMode = async (watchSpaceId, hostId, mode) => {
  if (!["manual", "automatic"].includes(mode)) {
    throw new Error("Playback mode must be manual or automatic");
  }

  const watchSpace = await WatchSpace.findById(watchSpaceId);
  if (!watchSpace) {
    throw new Error("WatchSpace not found");
  }

  if (watchSpace.host.toString() !== hostId.toString()) {
    throw new Error("Only the host can change playback mode");
  }

  if (watchSpace.status === "ended") {
    throw new Error("This WatchSpace has already ended");
  }

  if (
    watchSpace.activeVote &&
    ["open", "closed"].includes(watchSpace.activeVote.status)
  ) {
    throw new Error("Finish the current story vote before changing mode");
  }

  watchSpace.playbackMode = mode;
  await watchSpace.save();

  return watchSpace;
};

export const setWatchSpaceLock = async (watchSpaceId, hostId, isLocked) => {
  const watchSpace = await WatchSpace.findById(watchSpaceId);

  if (!watchSpace) {
    throw new Error("WatchSpace not found");
  }

  if (watchSpace.host.toString() !== hostId.toString()) {
    throw new Error("Only the host can lock or unlock this WatchSpace");
  }

  if (watchSpace.status === "ended") {
    throw new Error("This WatchSpace has already ended");
  }

  watchSpace.isLocked = isLocked;

  await watchSpace.save();

  return watchSpace;
};

export const transferWatchSpaceHost = async (
  watchSpaceId,
  currentHostId,
  newHostId,
) => {
  const watchSpace = await WatchSpace.findById(watchSpaceId);

  if (!watchSpace) {
    throw new Error("WatchSpace not found");
  }

  if (watchSpace.host.toString() !== currentHostId.toString()) {
    throw new Error("Only the current host can transfer ownership");
  }

  if (watchSpace.status === "ended") {
    throw new Error("This WatchSpace has already ended");
  }

  const newHost = watchSpace.participants.find(
    (participant) => participant.user.toString() === newHostId.toString(),
  );

  if (!newHost) {
    throw new Error("New host must be a participant of this WatchSpace");
  }

  if (newHost.role === "host") {
    throw new Error("User is already the host");
  }

  const currentHost = watchSpace.participants.find(
    (participant) => participant.user.toString() === currentHostId.toString(),
  );

  if (!currentHost) {
    throw new Error("Current host participant record not found");
  }

  currentHost.role = "viewer";
  newHost.role = "host";
  watchSpace.host = newHostId;

  await watchSpace.save();

  return watchSpace;
};

// Get upcoming scheduled WatchSpaces for a user.
export const getUpcomingScheduledWatchSpaces = async (userId, limit = 10) => {
  const safeLimit = Math.min(20, Math.max(1, Number(limit) || 10));

  return WatchSpace.find({
    status: "scheduled",
    scheduledAt: { $gt: new Date() },
    $or: [{ host: userId }, { "participants.user": userId }],
  })
    .populate("title", "name description duration thumbnailKey")
    .populate("host", "name avatar")
    .sort({ scheduledAt: 1 })
    .limit(safeLimit);
};

// Get active WatchSpaces the current user can rejoin.
export const getMyActiveWatchSpaces = async (userId, limit = 10) => {
  const safeLimit = Math.min(20, Math.max(1, Number(limit) || 10));

  return WatchSpace.find({
    status: "active",
    $or: [{ host: userId }, { "participants.user": userId }],
  })
    .populate("title", "name description duration thumbnailKey")
    .populate("host", "name avatar")
    .sort({ updatedAt: -1 })
    .limit(safeLimit);
};

// Get ended WatchSpaces for the logged-in user
export const getMyEndedWatchSpaces = async (userId, limit = 10) => {
  const safeLimit = Math.min(20, Math.max(1, Number(limit) || 10));

  console.log("[DEBUG] getMyEndedWatchSpaces called:", {
    userId: userId.toString(),
    limit: safeLimit,
  });

  const watchSpaces = await WatchSpace.find({
    status: "ended",
    endedAt: { $ne: null },
    $or: [{ host: userId }, { "participants.user": userId }],
  })
    .populate("title", "name description duration thumbnailKey")
    .populate("host", "name avatar")
    .sort({ endedAt: -1 })
    .limit(safeLimit);

  console.log(
    "[DEBUG] Ended WatchSpaces:",
    watchSpaces.map((space) => ({
      id: space._id.toString(),
      status: space.status,
      endedAt: space.endedAt,
    })),
  );

  return watchSpaces;
};

// Get all WatchSpaces currently hosted by the logged-in user.
export const getMyHostedWatchSpaces = async (userId, limit = 20) => {
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));

  return WatchSpace.find({
    status: { $in: ["scheduled", "waiting", "active", "ended"] },
    $or: [
      // Canonical ownership field used by newly created WatchSpaces.
      { host: userId },
      // Compatibility for existing records where the participant host
      // role exists but the top-level host field is out of sync.
      {
        participants: {
          $elemMatch: {
            user: userId,
            role: "host",
          },
        },
      },
    ],
  })
    .populate("title", "name description duration thumbnailKey")
    .populate("host", "name avatar")
    .sort({ createdAt: -1 })
    .limit(safeLimit);
};

// Delete a WatchSpace (Current Host Only)
export const deleteWatchSpace = async (watchSpaceId, hostId) => {
  const watchSpace = await WatchSpace.findById(watchSpaceId);

  if (!watchSpace) {
    throw new Error("WatchSpace not found");
  }

  if (watchSpace.host.toString() !== hostId.toString()) {
    throw new Error("Only the host can delete this WatchSpace");
  }

  await WatchSpace.findByIdAndDelete(watchSpaceId);

  return watchSpace;
};

// Get all WatchSpaces hosted or joined by the logged-in user.
export const getMyWatchSpaces = async (userId, limit = 50) => {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));

  return WatchSpace.find({
    status: { $in: ["scheduled", "waiting", "active", "ended"] },
    $or: [{ host: userId }, { "participants.user": userId }],
  })
    .populate("title", "name description duration thumbnailKey")
    .populate("host", "name avatar")
    .sort({ updatedAt: -1 })
    .limit(safeLimit);
};
