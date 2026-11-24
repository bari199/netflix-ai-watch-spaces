import dotenv from "dotenv";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import User from "../src/models/User.js";
import Title from "../src/models/Title.js";
import WatchSpace from "../src/models/WatchSpace.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");

dotenv.config({ path: ENV_PATH });

const EXPECTED_DATABASE = "netflix_ai_watch_spaces_test";

const HOST_EMAIL = "test-host@netflix-ai-watch-spaces.local";
const VIEWER_EMAIL = "test-viewer@netflix-ai-watch-spaces.local";

const updateEnvVariable = (key, value) => {
  let content = fs.readFileSync(ENV_PATH, "utf8");

  const pattern = new RegExp(`^${key}=.*$`, "m");
  const line = `${key}=${value}`;

  if (pattern.test(content)) {
    content = content.replace(pattern, line);
  } else {
    content += `\n${line}\n`;
  }

  fs.writeFileSync(ENV_PATH, content, "utf8");
};

const createAccessToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "1h" },
  );

const seedTestData = async () => {
  const mongoUri = process.env.MONGODB_TEST_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_TEST_URI is missing.");
  }

  if (!process.env.ACCESS_TOKEN_SECRET) {
    throw new Error("ACCESS_TOKEN_SECRET is missing.");
  }

  const parsedUri = new URL(mongoUri);
  const databaseName = parsedUri.pathname.slice(1).split("/")[0];

  if (databaseName !== EXPECTED_DATABASE) {
    throw new Error(
      `Unsafe database: ${databaseName}. Expected: ${EXPECTED_DATABASE}`,
    );
  }

  await mongoose.connect(mongoUri);

  console.log("Connected to test database:", mongoose.connection.name);

  // 1. Create or update Host test user.
  const host = await User.findOneAndUpdate(
    { email: HOST_EMAIL },
    {
      $set: {
        name: "Test Host",
        email: HOST_EMAIL,
        role: "host",
        isEmailVerified: true,
        authProvider: "local",
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  // 2. Create or update Viewer test user.
  const viewer = await User.findOneAndUpdate(
    { email: VIEWER_EMAIL },
    {
      $set: {
        name: "Test Viewer",
        email: VIEWER_EMAIL,
        role: "viewer",
        isEmailVerified: true,
        authProvider: "local",
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  console.log("Test Host ready:", host._id.toString());
  console.log("Test Viewer ready:", viewer._id.toString());

  // 3. Create or update test Title.
  const title = await Title.findOneAndUpdate(
    { name: "Netflix Integration Test Movie" },
    {
      $set: {
        name: "Netflix Integration Test Movie",
        description: "Movie used for backend integration testing.",
        genre: ["Action", "Adventure"],
        releaseYear: 2026,
        duration: 3600,
        videoKey: "test/integration-test-video.mp4",
        thumbnailKey: "test/integration-test-thumbnail.jpg",
        isPublished: true,
        createdBy: host._id,
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  console.log("Test Title ready:", title._id.toString());

  // 4. Create or reset the dedicated test WatchSpace.
  const watchSpace = await WatchSpace.findOneAndUpdate(
    {
      title: title._id,
      host: host._id,
    },
    {
      $set: {
        title: title._id,
        host: host._id,

        participants: [
          {
            user: host._id,
            role: "host",
            isMuted: false,
          },
          {
            user: viewer._id,
            role: "viewer",
            isMuted: false,
          },
        ],

        status: "active",
        startedAt: new Date(),
        endedAt: null,

        playbackMode: "manual",

        playback: {
          state: "paused",
          positionSeconds: 0,
          updatedAt: new Date(),
          updatedBy: host._id,
        },

        activeVote: null,

        triggeredTriviaEventIds: [],
        triggeredVariationEventIds: [],
        triggeredVariationVoteIds: [],

        peakParticipants: 2,
        aiQuestionsAsked: 0,
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  console.log("Test WatchSpace ready:", watchSpace._id.toString());

  // Save the dedicated test WatchSpace ID.
  updateEnvVariable("WATCH_SPACE_TEST_ID", watchSpace._id.toString());

  // 5. Generate fresh access tokens.
  const hostToken = createAccessToken(host);
  const viewerToken = createAccessToken(viewer);

  // Single-user socket tests use the Host token.
  updateEnvVariable("SOCKET_TEST_TOKEN", hostToken);
  updateEnvVariable("HOST_SOCKET_TEST_TOKEN", hostToken);
  updateEnvVariable("VIEWER_SOCKET_TEST_TOKEN", viewerToken);

  console.log("Test WatchSpace ID saved to root .env.");
  console.log("Fresh test tokens saved to root .env.");
  console.log("Test database seeding completed successfully.");
};

// Execution
try {
  await seedTestData();
} catch (error) {
  console.error("Test seed failed:", error.message);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
