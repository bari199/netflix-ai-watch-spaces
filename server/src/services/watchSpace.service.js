import { randomBytes } from "node:crypto";
import WatchSpace from "../models/WatchSpace.js";

export const createWatchSpace = async (
  titleId,
  hostId,
  isPrivate = false,
  maxParticipants = 50,
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

  if (watchSpace.isPrivate && watchSpace.inviteCode !== inviteCode) {
    throw new Error("Invalid invite code");
  }

  const alreadyJoined = watchSpace.participants.some(
    (p) => p.user.toString() === userId.toString(),
  );

  if (!alreadyJoined) {
    if (watchSpace.participants.length >= watchSpace.maxParticipants) {
      throw new Error("WatchSpace has reached its participant limit");
    }

    watchSpace.participants.push({ user: userId, role: "viewer" });
    await watchSpace.save();
  }

  if (!alreadyJoined) {
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
