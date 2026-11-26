import "./config/env.js";

import http from "node:http";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initializeMinIO } from "./config/minio.js";
import initializeSocket from "./sockets/index.js";

const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";

const startServer = async () => {
  try {
    await connectDB({
      useTestDatabase: process.env.NODE_ENV === "test",
    });

    await initializeMinIO();

    const httpServer = http.createServer(app);

    const io = initializeSocket(httpServer);
    app.set("io", io);

    httpServer.listen(PORT, HOST, () => {
      console.log(
        `Netflix backend running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`,
      );
      console.log("Socket.IO server initialized successfully");
    });
  } catch (error) {
    console.error("Backend startup failed:", error);
    process.exit(1);
  }
};

startServer();
