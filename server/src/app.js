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

const app = express();

// Security middleware
app.use(helmet());

// Request middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(passport.initialize());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/titles", titleRoutes);
app.use("/api/watch-spaces", watchSpaceRoutes);

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

export default app;
