import test from "node:test";
import assert from "node:assert/strict";
import { io as createClient } from "socket.io-client";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const SERVER_URL = "http://localhost:5000";
const WATCH_SPACE_ID = "6af20bef2ce49f8c669bc91f";

const HOST_TOKEN = process.env.HOST_SOCKET_TEST_TOKEN;
const VIEWER_TOKEN = process.env.VIEWER_SOCKET_TEST_TOKEN;

const connectSocket = (token) =>
  new Promise((resolve, reject) => {
    const socket = createClient(SERVER_URL, {
      auth: { token },
      reconnection: false,
      timeout: 10000,
    });

    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", reject);
  });

const emitWithAck = (socket, eventName, data) =>
  new Promise((resolve) => {
    socket.emit(eventName, data, resolve);
  });

const waitForEvent = (socket, eventName) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${eventName} timed out`));
    }, 5000);

    socket.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

test("Chat system: message, history, typing and reactions", async (t) => {
  assert.ok(HOST_TOKEN, "HOST_SOCKET_TEST_TOKEN is missing");
  assert.ok(VIEWER_TOKEN, "VIEWER_SOCKET_TEST_TOKEN is missing");

  const host = await connectSocket(HOST_TOKEN);
  const viewer = await connectSocket(VIEWER_TOKEN);

  t.after(() => {
    host.disconnect();
    viewer.disconnect();
  });

  // Step 1: Join WatchSpace
  const joinRoom = async (socket) => {
    const result = await emitWithAck(socket, "room.join", {
      watchSpaceId: WATCH_SPACE_ID,
    });

    assert.equal(result.success, true, result.message);
  };

  await joinRoom(host);
  await joinRoom(viewer);

  // Step 2: Send message
  const messageEventPromise = waitForEvent(viewer, "chat.message.new");

  const sendResult = await emitWithAck(host, "chat.message.send", {
    watchSpaceId: WATCH_SPACE_ID,
    message: "Chat socket integration test",
  });

  assert.equal(sendResult.success, true);

  const receivedMessage = await messageEventPromise;

  assert.equal(receivedMessage.payload.message, "Chat socket integration test");

  console.log("PASS: Real-time message delivery");

  // Step 3: Retrieve message history
  const historyResult = await emitWithAck(viewer, "chat.history.get", {
    watchSpaceId: WATCH_SPACE_ID,
    limit: 10,
  });

  assert.equal(historyResult.success, true);

  assert.ok(
    historyResult.messages.some(
      (item) => item._id.toString() === sendResult.message._id.toString(),
    ),
  );

  console.log("PASS: Chat history retrieval");

  // Step 4: Typing indicator
  const typingEventPromise = waitForEvent(viewer, "chat.typing.update");

  host.emit("chat.typing", {
    watchSpaceId: WATCH_SPACE_ID,
    isTyping: true,
  });

  const typingData = await typingEventPromise;

  assert.equal(typingData.isTyping, true);

  console.log("PASS: Typing indicator");

  // Step 5: Add first emoji reaction
  const messageId = sendResult.message._id;
  const hostUserId = sendResult.message.sender._id.toString();

  const firstReactionEvent = waitForEvent(viewer, "chat.reaction.updated");

  const firstReactionResult = await emitWithAck(host, "chat.reaction.add", {
    watchSpaceId: WATCH_SPACE_ID,
    messageId,
    emoji: "👍",
  });

  assert.equal(firstReactionResult.success, true);
  await firstReactionEvent;

  let hostReactions = firstReactionResult.message.reactions.filter(
    (reaction) => reaction.user.toString() === hostUserId,
  );

  assert.equal(hostReactions.length, 1);
  assert.equal(hostReactions[0].emoji, "👍");

  console.log("PASS: First emoji reaction");

  // Step 6: Add a second different emoji
  const secondReactionEvent = waitForEvent(viewer, "chat.reaction.updated");

  const secondReactionResult = await emitWithAck(host, "chat.reaction.add", {
    watchSpaceId: WATCH_SPACE_ID,
    messageId,
    emoji: "❤️",
  });

  assert.equal(secondReactionResult.success, true);
  await secondReactionEvent;

  hostReactions = secondReactionResult.message.reactions.filter(
    (reaction) => reaction.user.toString() === hostUserId,
  );

  assert.equal(hostReactions.length, 2);

  assert.ok(hostReactions.some((reaction) => reaction.emoji === "👍"));

  assert.ok(hostReactions.some((reaction) => reaction.emoji === "❤️"));

  console.log("PASS: Multiple emoji reactions");

  // Step 7: Toggle the first emoji off
  const toggleEvent = waitForEvent(viewer, "chat.reaction.updated");

  const toggleResult = await emitWithAck(host, "chat.reaction.add", {
    watchSpaceId: WATCH_SPACE_ID,
    messageId,
    emoji: "👍",
  });

  assert.equal(toggleResult.success, true);
  await toggleEvent;

  const remainingHostReactions = toggleResult.message.reactions.filter(
    (reaction) => reaction.user.toString() === hostUserId,
  );

  assert.equal(remainingHostReactions.length, 1);
  assert.equal(remainingHostReactions[0].emoji, "❤️");

  console.log("PASS: Emoji reaction toggle");

  // Step 8: Verify another user's reaction is independent
  const viewerReactionEvent = waitForEvent(host, "chat.reaction.updated");

  const viewerReactionResult = await emitWithAck(viewer, "chat.reaction.add", {
    watchSpaceId: WATCH_SPACE_ID,
    messageId,
    emoji: "🔥",
  });

  assert.equal(viewerReactionResult.success, true);
  await viewerReactionEvent;

  const finalHostReactions = viewerReactionResult.message.reactions.filter(
    (reaction) => reaction.user.toString() === hostUserId,
  );

  const viewerUserId = viewerReactionResult.message.reactions
    .find((reaction) => reaction.emoji === "🔥")
    ?.user.toString();

  assert.equal(finalHostReactions.length, 1);
  assert.equal(finalHostReactions[0].emoji, "❤️");
  assert.ok(viewerUserId);
  assert.notEqual(viewerUserId, hostUserId);

  console.log("PASS: Different users have independent reactions");
  console.log("All chat socket integration tests passed.");
});
