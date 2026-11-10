import dotenv from "dotenv";
import { io } from "socket.io-client";

dotenv.config({ path: "../.env" });

const accessToken = process.env.SOCKET_TEST_TOKEN;

const watchSpaceId = "6aeca86c39e62cb020f09f85";

if (!accessToken) {
  console.error("SOCKET_TEST_TOKEN is missing");
  process.exit(1);
}

const socket = io("http://localhost:5000", {
  auth: { token: accessToken },
  reconnection: false,
  timeout: 5000,
});

socket.on("connect", () => {
  console.log("PASS: Socket.IO connection established");

  socket.emit("room.join", { watchSpaceId }, (joinResponse) => {
    if (!joinResponse?.success) {
      console.error("FAIL: Room join:", joinResponse?.message);
      socket.disconnect();
      process.exitCode = 1;
      return;
    }

    console.log("PASS: WatchSpace room joined");
    console.log("Role:", joinResponse.role);

    socket.emit("room.leave", { watchSpaceId }, (leaveResponse) => {
      if (!leaveResponse?.success) {
        console.error("FAIL: Room leave:", leaveResponse?.message);
        process.exitCode = 1;
      } else {
        console.log("PASS: WatchSpace room left");
      }

      socket.disconnect();
    });
  });
});

socket.on("connect_error", (error) => {
  console.error("FAIL:", error.message);
  process.exit(1);
});

socket.on("disconnect", (reason) => {
  console.log("Socket disconnected:", reason);
});
