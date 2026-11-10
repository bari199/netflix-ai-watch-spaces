import "./config/env.js";

import http from "node:http";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initializeMinIO } from "./config/minio.js";
import initializeSocket from "./sockets/index.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await initializeMinIO();

    const httpServer = http.createServer(app);

    // Initialize Socket.IO
    const io = initializeSocket(httpServer);

    // Make Socket.IO available to Express controllers
    app.set("io", io);

    httpServer.listen(PORT, () => {
      console.log(`Netflix backend running on port ${PORT}`);
      console.log("Socket.IO server initialized successfully");
    });
  } catch (error) {
    console.error("Backend startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
