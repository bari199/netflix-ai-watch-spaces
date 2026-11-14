import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import registerRoomHandlers from "./room.socket.js";
import registerPlaybackHandlers from "./playback.socket.js";
import registerChatHandlers from "./chat.socket.js";
import registerPresenceHandlers from "./presence.socket.js";

const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  // Socket Authentication using JWT
  io.use(async (socket, next) => {
    try {
      const accessToken = socket.handshake.auth?.token;

      if (!accessToken) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

      const user = await User.findById(decoded.sub).select(
        "_id name email avatar role isEmailVerified authProvider",
      );

      if (!user) {
        return next(new Error("User no longer exists"));
      }

      socket.user = user;
      socket.data.userId = user._id.toString();
      next();
    } catch (error) {
      console.error("Socket authentication error:", error.message);
      next(new Error("Invalid or expired access token"));
    }
  });

  // Handle authenticated socket connections
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.user._id}`);

    // Register WatchSpace room events
    registerRoomHandlers(io, socket);
    registerPlaybackHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerPresenceHandlers(io, socket);

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${socket.user._id} - ${reason}`);
    });
  });

  return io;
};

export default initializeSocket;
