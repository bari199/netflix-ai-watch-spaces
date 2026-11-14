import mongoose from "mongoose";
import WatchSpace from "../models/WatchSpace.js";

const registerPresenceHandlers = (io, socket) => {
  const getRoomName = (watchSpaceId) => `watchspace:${watchSpaceId}`;

  // Get currently connected participants
  const getOnlineParticipants = async (watchSpaceId) => {
    const roomName = getRoomName(watchSpaceId);
    const sockets = await io.in(roomName).fetchSockets();

    const onlineUserIds = [
      ...new Set(
        sockets
          .map((connectedSocket) => connectedSocket.user?._id?.toString())
          .filter(Boolean),
      ),
    ];

    const watchSpace = await WatchSpace.findById(watchSpaceId).populate(
      "participants.user",
      "name avatar",
    );

    if (!watchSpace) {
      throw new Error("WatchSpace not found");
    }

    return watchSpace.participants
      .filter((participant) =>
        onlineUserIds.includes(participant.user?._id?.toString()),
      )
      .map((participant) => ({
        user: {
          _id: participant.user._id,
          name: participant.user.name,
          avatar: participant.user.avatar,
        },
        role: participant.role,
        isOnline: true,
      }));
  };

  // Send current presence to everyone in a WatchSpace
  const broadcastPresence = async (watchSpaceId) => {
    const participants = await getOnlineParticipants(watchSpaceId);

    io.to(getRoomName(watchSpaceId)).emit("presence.updated", {
      watchSpaceId: watchSpaceId.toString(),
      participants,
      ts: Date.now(),
    });
  };

  // Get current presence after joining a WatchSpace
  socket.on("presence.get", async (data, callback) => {
    try {
      const { watchSpaceId } = data || {};

      if (!mongoose.isValidObjectId(watchSpaceId)) {
        throw new Error("Invalid WatchSpace ID");
      }

      const roomName = getRoomName(watchSpaceId);

      if (!socket.rooms.has(roomName)) {
        throw new Error("Join the WatchSpace before requesting presence");
      }

      const participants = await getOnlineParticipants(watchSpaceId);

      if (typeof callback === "function") {
        callback({
          success: true,
          watchSpaceId,
          participants,
        });
      }
    } catch (error) {
      if (typeof callback === "function") {
        callback({
          success: false,
          message: error.message,
        });
      }
    }
  });

  // Track WatchSpaces joined by this socket
  socket.data.presenceWatchSpaces ??= new Set();

  const trackJoinedWatchSpace = (watchSpaceId) => {
    socket.data.presenceWatchSpaces.add(watchSpaceId.toString());
  };

  const broadcastJoinedWatchSpace = async (watchSpaceId) => {
    try {
      trackJoinedWatchSpace(watchSpaceId);
      await broadcastPresence(watchSpaceId);
    } catch (error) {
      console.error("Presence join update failed:", error.message);
    }
  };

  // Broadcast presence after room.join succeeds
  socket.on("presence.join", async (data, callback) => {
    try {
      const { watchSpaceId } = data || {};

      if (!mongoose.isValidObjectId(watchSpaceId)) {
        throw new Error("Invalid WatchSpace ID");
      }

      const roomName = getRoomName(watchSpaceId);

      if (!socket.rooms.has(roomName)) {
        throw new Error("Join the WatchSpace before updating presence");
      }

      await broadcastJoinedWatchSpace(watchSpaceId);

      if (typeof callback === "function") {
        callback({ success: true });
      }
    } catch (error) {
      if (typeof callback === "function") {
        callback({ success: false, message: error.message });
      }
    }
  });

  // Remove this socket from tracked WatchSpaces on disconnect
  socket.on("disconnect", async () => {
    const watchSpaceIds = [...(socket.data.presenceWatchSpaces || [])];

    for (const watchSpaceId of watchSpaceIds) {
      try {
        await broadcastPresence(watchSpaceId);
      } catch (error) {
        console.error("Presence disconnect update failed:", error.message);
      }
    }
  });
};

export default registerPresenceHandlers;
