import mongoose from "mongoose";
import WatchSpace from "../models/WatchSpace.js";
import Title from "../models/Title.js";

const activeVoteTimers = new Map();

const getRoomName = (watchSpaceId) => `watchspace:${watchSpaceId}`;

const sendError = (callback, message) => {
  if (typeof callback === "function") {
    callback({ success: false, message });
  }
};

const isRoomMember = (socket, watchSpaceId) => {
  return socket.rooms.has(getRoomName(watchSpaceId));
};

const isParticipant = (watchSpace, userId) => {
  return watchSpace.participants.some(
    (participant) => participant.user.toString() === userId,
  );
};

export const resolveVariationWinner = (options, votes) => {
  const voteCounts = Object.fromEntries(
    options.map((option) => [option.id, 0]),
  );

  for (const vote of votes) {
    if (Object.prototype.hasOwnProperty.call(voteCounts, vote.optionId)) {
      voteCounts[vote.optionId] += 1;
    }
  }

  let winningOptionId = null;
  let highestVotes = -1;

  options.forEach((option) => {
    const count = voteCounts[option.id] ?? 0;
    if (count > highestVotes) {
      highestVotes = count;
      winningOptionId = option.id;
    }
  });

  return { voteCounts, winningOptionId };
};



const closeVote = async (io, watchSpaceId) => {
  try {
    const watchSpace = await WatchSpace.findById(watchSpaceId);

    if (!watchSpace?.activeVote) return;

    const vote = watchSpace.activeVote;

    // Prevent duplicate vote closing
    if (vote.status !== "open") return;

    const { voteCounts, winningOptionId } = resolveVariationWinner(
      vote.options,
      vote.votes,
    );

    vote.status = "closed";
    vote.winningOptionId = winningOptionId;

    await watchSpace.save();

    const roomName = getRoomName(watchSpaceId);

    io.to(roomName).emit("room.variation.voteResult", {
      watchSpaceId: watchSpaceId.toString(),
      variationId: vote.variationId,
      voteCounts,
      winningOptionId,
      applyAtSeconds: vote.applyAtSeconds,
    });

  } catch (error) {
    console.error("Variation vote closing error:", error);
  } finally {
    const timer = activeVoteTimers.get(watchSpaceId);

    if (timer) {
      clearTimeout(timer);
      activeVoteTimers.delete(watchSpaceId);
    }
  }
};

const registerVariationHandlers = (io, socket) => {

  socket.on("variation.vote.state.get", async (data = {}, callback) => {
    try {
      const { watchSpaceId } = data;
      if (!mongoose.Types.ObjectId.isValid(watchSpaceId)) {
        return sendError(callback, "Invalid WatchSpace ID.");
      }
      if (!isRoomMember(socket, watchSpaceId)) {
        return sendError(callback, "Join the WatchSpace first.");
      }

      const watchSpace = await WatchSpace.findById(watchSpaceId).select(
        "activeVote playback",
      );
      if (!watchSpace) {
        return sendError(callback, "WatchSpace not found.");
      }

      if (typeof callback === "function") {
        callback({
          success: true,
          activeVote: watchSpace.activeVote || null,
          playback: watchSpace.playback || null,
        });
      }
    } catch (error) {
      sendError(callback, error.message || "Could not retrieve vote state.");
    }
  });

  const userId = socket.data.userId;

  // HOST: Start a timed narrative variation vote
  socket.on("variation.vote.start", async (data = {}, callback) => {
    try {
      const { watchSpaceId, variationId, durationSeconds = 30 } = data;

      if (
        !mongoose.Types.ObjectId.isValid(watchSpaceId) ||
        typeof variationId !== "string" ||
        !variationId.trim()
      ) {
        return sendError(callback, "Invalid vote information.");
      }

      if (
        !Number.isInteger(durationSeconds) ||
        durationSeconds < 5 ||
        durationSeconds > 120
      ) {
        return sendError(
          callback,
          "Vote duration must be between 5 and 120 seconds.",
        );
      }

      if (!isRoomMember(socket, watchSpaceId)) {
        return sendError(callback, "Join the WatchSpace first.");
      }

      const watchSpace = await WatchSpace.findById(watchSpaceId);

      if (!watchSpace) {
        return sendError(callback, "WatchSpace not found.");
      }

      if (watchSpace.status !== "active") {
        return sendError(callback, "WatchSpace is not active.");
      }

      if (watchSpace.host.toString() !== userId) {
        return sendError(callback, "Only the Host can start a vote.");
      }

      if (!isParticipant(watchSpace, userId)) {
        return sendError(callback, "You are not a WatchSpace participant.");
      }

      if (!watchSpace.votingEnabled) {
        return sendError(callback, "Voting is disabled in this WatchSpace.");
      }

      if (watchSpace.activeVote && ["open", "closed"].includes(watchSpace.activeVote.status)) {
        return sendError(callback, "The previous vote has not been applied yet.");
      }

      const title = await Title.findById(watchSpace.title);

      if (!title) {
        return sendError(callback, "Title not found.");
      }

      // Only use pre-authored variation points from the Title timeline
      const variationEvent = title.timeline.find(
        (event) =>
          event.variationId === variationId &&
          event.eventType === "variationPoint",
      );

      if (!variationEvent) {
        return sendError(callback, "Pre-authored variation point not found.");
      }

      if (
        !Array.isArray(variationEvent.options) ||
        variationEvent.options.length < 2
      ) {
        return sendError(
          callback,
          "This variation point needs at least two options.",
        );
      }

      const options = variationEvent.options.map((option) => ({
        id: option.id,
        label: option.label,
      }));

      const closesAt = new Date(Date.now() + durationSeconds * 1000);

      watchSpace.activeVote = {
        variationId,
        options,
        status: "open",
        durationSeconds,
        closesAt,
        applyAtSeconds: variationEvent.startTime,
        votes: [],
        winningOptionId: null,
        appliedAt: null,
        triggeredBy: userId,
      };

      await watchSpace.save();

      const roomName = getRoomName(watchSpaceId);

      io.to(roomName).emit("room.variation.voteOpen", {
        watchSpaceId: watchSpaceId.toString(),
        variationId,
        options,
        closesAt,
      });

      if (typeof callback === "function") {
        callback({
          success: true,
          message: "Variation vote started.",
          variationId,
          closesAt,
        });
      }

      // Automatically close the vote after its configured duration
      const previousTimer = activeVoteTimers.get(watchSpaceId);

      if (previousTimer) clearTimeout(previousTimer);

      const timer = setTimeout(() => {
        closeVote(io, watchSpaceId);
      }, durationSeconds * 1000);

      activeVoteTimers.set(watchSpaceId, timer);
    } catch (error) {
      console.error("Variation vote start error:", error);
      sendError(callback, "Failed to start variation vote.");
    }
  });

  // PARTICIPANT: Cast or update a vote
  socket.on("variation.vote.cast", async (data = {}, callback) => {
    try {
      const { watchSpaceId, optionId } = data;

      if (
        !mongoose.Types.ObjectId.isValid(watchSpaceId) ||
        typeof optionId !== "string" ||
        !optionId.trim()
      ) {
        return sendError(callback, "Invalid vote information.");
      }

      if (!isRoomMember(socket, watchSpaceId)) {
        return sendError(callback, "Join the WatchSpace first.");
      }

      const watchSpace = await WatchSpace.findById(watchSpaceId);

      if (!watchSpace) {
        return sendError(callback, "WatchSpace not found.");
      }

      if (!isParticipant(watchSpace, userId)) {
        return sendError(callback, "You are not a WatchSpace participant.");
      }

      if (!watchSpace.votingEnabled) {
        return sendError(callback, "Voting is disabled.");
      }

      const vote = watchSpace.activeVote;

      if (!vote || vote.status !== "open") {
        return sendError(callback, "There is no active vote.");
      }

      if (new Date(vote.closesAt).getTime() <= Date.now()) {
        await closeVote(io, watchSpaceId);
        return sendError(callback, "Voting time has expired.");
      }

      const selectedOption = vote.options.find(
        (option) => option.id === optionId,
      );

      if (!selectedOption) {
        return sendError(callback, "Invalid voting option.");
      }

      // One vote per participant; a new vote replaces the previous vote
      const existingVote = vote.votes.find(
        (item) => item.user.toString() === userId,
      );

      if (existingVote) {
        existingVote.optionId = optionId;
        existingVote.votedAt = new Date();
      } else {
        vote.votes.push({
          user: userId,
          optionId,
          votedAt: new Date(),
        });
      }

      await watchSpace.save();

      if (typeof callback === "function") {
        callback({
          success: true,
          message: "Vote recorded successfully.",
          optionId,
        });
      }
    } catch (error) {
      console.error("Variation vote cast error:", error);
      sendError(callback, "Failed to record vote.");
    }
  });
};

export default registerVariationHandlers;
