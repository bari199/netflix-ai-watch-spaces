import mongoose from "mongoose";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import passport from "./config/passport.js";
import titleRoutes from "./routes/title.routes.js";
import watchSpaceRoutes from "./routes/watchSpace.routes.js";
import recommendationRoutes from "./routes/recommendation.routes.js";
import interactionRoutes from "./routes/interaction.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const app = express();

// Security middleware
app.use(helmet());

// Request middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(passport.initialize());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/titles", titleRoutes);
app.use("/api/watch-spaces", watchSpaceRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/interactions", interactionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/admin", adminRoutes);

// Health check
app.get("/api/health", (req, res) => {
  const dbStatus =
    mongoose.connection.readyState === 1 ? "connected" : "disconnected";

  const isHealthy = dbStatus === "connected";

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    message: "Netflix AI Watch Spaces API health status",
    services: {
      api: "running",
      database: dbStatus,
    },
    timestamp: new Date().toISOString(),
  });
});

// Global error handling middleware
app.use((error, req, res, next) => {
  console.error("\\n========== API ERROR ==========");
  console.error("Method:", req.method);
  console.error("URL:", req.originalUrl);
  console.error("Message:", error.message);
  console.error("Stack:", error.stack);
  console.error("================================\\n");

  if (res.headersSent) {
    return next(error);
  }

  const statusCode =
    Number.isInteger(error.statusCode) &&
    error.statusCode >= 400 &&
    error.statusCode <= 599
      ? error.statusCode
      : 500;

  res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 ? "Internal server error" : error.message,
  });
});

export default app;
