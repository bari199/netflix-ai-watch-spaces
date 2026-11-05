import "./config/env.js";
import { initializeMinIO } from "./config/minio.js";

import http from "node:http";
import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await initializeMinIO();

    const httpServer = http.createServer(app);

    httpServer.listen(PORT, () => {
      console.log(`Netflix backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Backend startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
