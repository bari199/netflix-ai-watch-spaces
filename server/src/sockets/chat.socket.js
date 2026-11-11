import mongoose from "mongoose";
import ChatMessage from "../models/ChatMessage.js";
import WatchSpace from "../models/WatchSpace.js";

const getWatchSpace = async (watchSpaceId, userId) => {
  if (!mongoose.isValidObjectId(watchSpaceId)) {
    return null;
  }

  const watchSpace = await WatchSpace.findById(watchSpaceId);

  if (!watchSpace || watchSpace.status === "ended") {
    return null;
  }

  const participant = watchSpace.participants.find(
    (item) => item.user.toString() === userId,
  );

  if (!participant) {
    return null;
  }

  return { watchSpace, participant };
};

const registerChatHandlers = (io, socket) => {
  // Send a chat message
  socket.on("chat.message.send", async (data, callback) => {
    try {
      const { watchSpaceId, message } = data || {};

      if (typeof message !== "string" || !message.trim()) {
        return callback?.({
          success: false,
          message: "Message cannot be empty",
        });
      }

      if (message.trim().length > 2000) {
        return callback?.({
          success: false,
          message: "Message cannot exceed 2000 characters",
        });
      }

      const result = await getWatchSpace(watchSpaceId, socket.data.userId);

      if (!result) {
        return callback?.({
          success: false,
          message: "WatchSpace not found or access denied",
        });
      }

      if (!socket.rooms.has(`watchspace:${watchSpaceId}`)) {
        return callback?.({
          success: false,
          message: "Join the WatchSpace before sending messages",
        });
      }

      const savedMessage = await ChatMessage.create({
        watchSpace: watchSpaceId,
        sender: socket.user._id,
        message: message.trim(),
      });

      const populatedMessage = await ChatMessage.findById(
        savedMessage._id,
      ).populate("sender", "name avatar");

      const payload = {
        event: "chat.message.new",
        watchSpaceId,
        payload: populatedMessage,
        ts: Date.now(),
      };

      io.to(`watchspace:${watchSpaceId}`).emit("chat.message.new", payload);

      return callback?.({
        success: true,
        message: populatedMessage,
      });
    } catch (error) {
      console.error("Chat message send failed:", error.message);

      return callback?.({
        success: false,
        message: "Failed to send message",
      });
    }
  });

  // Retrieve recent chat history
  socket.on("chat.history.get", async (data, callback) => {
    try {
      const { watchSpaceId, limit = 50 } = data || {};

      const result = await getWatchSpace(watchSpaceId, socket.data.userId);

      if (!result) {
        return callback?.({
          success: false,
          message: "WatchSpace not found or access denied",
        });
      }

      if (!socket.rooms.has(`watchspace:${watchSpaceId}`)) {
        return callback?.({
          success: false,
          message: "Join the WatchSpace first",
        });
      }

      const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);

      const messages = await ChatMessage.find({
        watchSpace: watchSpaceId,
      })
        .sort({ createdAt: -1, _id: -1 })
        .limit(safeLimit)
        .populate("sender", "name avatar")
        .lean();

      return callback?.({
        success: true,
        messages: messages.reverse(),
      });
    } catch (error) {
      console.error("Chat history retrieval failed:", error.message);

      return callback?.({
        success: false,
        message: "Failed to retrieve chat history",
      });
    }
  });

  // Typing indicator
  socket.on("chat.typing", async (data) => {
    try {
      const { watchSpaceId, isTyping } = data || {};

      const result = await getWatchSpace(watchSpaceId, socket.data.userId);

      if (!result || !socket.rooms.has(`watchspace:${watchSpaceId}`)) {
        return;
      }

      socket.to(`watchspace:${watchSpaceId}`).emit("chat.typing.update", {
        watchSpaceId,
        user: {
          _id: socket.user._id,
          name: socket.user.name,
        },
        isTyping: Boolean(isTyping),
      });
    } catch (error) {
      console.error("Chat typing event failed:", error.message);
    }
  });

  // Add or update an emoji reaction
  socket.on("chat.reaction.add", async (data, callback) => {
    try {
      const { watchSpaceId, messageId, emoji } = data || {};

      if (
        typeof emoji !== "string" ||
        !emoji.trim() ||
        emoji.length > 32 ||
        !mongoose.isValidObjectId(messageId)
      ) {
        return callback?.({
          success: false,
          message: "Invalid reaction data",
        });
      }

      const result = await getWatchSpace(watchSpaceId, socket.data.userId);

      if (!result || !socket.rooms.has(`watchspace:${watchSpaceId}`)) {
        return callback?.({
          success: false,
          message: "WatchSpace access denied",
        });
      }

      const chatMessage = await ChatMessage.findOne({
        _id: messageId,
        watchSpace: watchSpaceId,
      });

      if (!chatMessage) {
        return callback?.({
          success: false,
          message: "Message not found",
        });
      }

      const userId = socket.data.userId;

      const normalizedEmoji = emoji.trim();

      const existingReactionIndex = chatMessage.reactions.findIndex(
        (reaction) =>
          reaction.user.toString() === userId &&
          reaction.emoji === normalizedEmoji,
      );

      if (existingReactionIndex >= 0) {
        chatMessage.reactions.splice(existingReactionIndex, 1);
      } else {
        chatMessage.reactions.push({
          user: userId,
          emoji: normalizedEmoji,
        });
      }

      await chatMessage.save();

      const populatedMessage = await ChatMessage.findById(
        chatMessage._id,
      ).populate("sender", "name avatar");

      const payload = {
        event: "chat.reaction.updated",
        watchSpaceId,
        payload: populatedMessage,
        ts: Date.now(),
      };

      io.to(`watchspace:${watchSpaceId}`).emit(
        "chat.reaction.updated",
        payload,
      );

      return callback?.({
        success: true,
        message: populatedMessage,
      });
    } catch (error) {
      console.error("Chat reaction failed:", error.message);

      return callback?.({
        success: false,
        message: "Failed to update reaction",
      });
    }
  });
};

export default registerChatHandlers;
