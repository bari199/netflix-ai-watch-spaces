import { randomBytes } from "node:crypto";
import WatchSpace from "../models/WatchSpace.js";

export const createWatchSpace = async (
  titleId,
  hostId,
  isPrivate = false,
  maxParticipants = 50,
  aiVerbosity = "normal",
  votingEnabled = true,
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
    votingEnabled,
  });

  return watchSpace;
};

export const getWatchSpaceById = async (watchSpaceId, userId) => {
  const watchSpace = await WatchSpace.findById(watchSpaceId)
    .populate("title", "name description duration thumbnailKey")
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
    status: { $ne: "ended" },
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

    await watchSpace.save();
  }

  return watchSpace;
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

  await watchSpace.save();

  return watchSpace;
};

// Host: Mute or unmute a participant
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
