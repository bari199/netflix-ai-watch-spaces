import mongoose from "mongoose";
import WatchSpace from "../models/WatchSpace.js";

const registerRoomHandlers = (io, socket) => {
  // Join WatchSpace Socket.IO room
  socket.on("room.join", async (data, callback) => {
    try {
      const { watchSpaceId } = data || {};

      if (!mongoose.isValidObjectId(watchSpaceId)) {
        throw new Error("Invalid WatchSpace ID");
      }

      const watchSpace = await WatchSpace.findById(watchSpaceId);

      if (!watchSpace) {
        throw new Error("WatchSpace not found");
      }

      if (watchSpace.status === "ended") {
        throw new Error("This WatchSpace has already ended");
      }

      const participant = watchSpace.participants.find(
        (p) => p.user.toString() === socket.user._id.toString(),
      );

      if (!participant) {
        throw new Error("You must join this WatchSpace before connecting");
      }

      const roomName = `watchspace:${watchSpaceId}`;

      await socket.join(roomName);

      const response = {
        success: true,
        message: "Joined WatchSpace room successfully",
        watchSpaceId,
        userId: socket.user._id.toString(),
        role: participant.role,
      };

      if (typeof callback === "function") {
        callback(response);
      }

      console.log(`${socket.user.name} joined socket room ${roomName}`);
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

  // Leave Socket.IO room (does not remove database membership)
  socket.on("room.leave", async (data, callback) => {
    try {
      const { watchSpaceId } = data || {};

      if (!mongoose.isValidObjectId(watchSpaceId)) {
        throw new Error("Invalid WatchSpace ID");
      }

      const roomName = `watchspace:${watchSpaceId}`;

      await socket.leave(roomName);

      const response = {
        success: true,
        message: "Left WatchSpace room successfully",
        watchSpaceId,
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
};

export default registerRoomHandlers;
