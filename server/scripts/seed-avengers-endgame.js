import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";

import { Upload } from "@aws-sdk/lib-storage";

import Title, { TIMELINE_EVENT_TYPES } from "../src/models/Title.js";

import User from "../src/models/User.js";

// --------------------------------------------------
// PATHS AND ENVIRONMENT
// --------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const SERVER_ROOT = path.resolve(__dirname, "..");

dotenv.config({
  path: path.join(PROJECT_ROOT, ".env"),
});

const ASSET_DIR = path.join(PROJECT_ROOT, "video", "avengers-endgame");

const DATASET_PATH = path.join(
  SERVER_ROOT,
  "seed-data",
  "avengers-endgame.txt",
);

// Keep the original video filename unchanged.
const VIDEO_PATH = path.join(
  PROJECT_ROOT,
  "video",
  "avengers-endgame",
  "Avengers-Endgame-Encore-(2026)-Hindi-Dubbed--720p-[Orgmovies].mp4",
);

const THUMBNAIL_PATH = path.join(ASSET_DIR, "thumbnail.jpg");

// MinIO object keys
const VIDEO_KEY =
  "video/avengers-endgame/Avengers-Endgame-Encore-(2026)-Hindi-Dubbed--720p-[Orgmovies].mp4";
const THUMBNAIL_KEY = "thumbnails/avengers-endgame/thumbnail.jpg";

// --------------------------------------------------
// TITLE METADATA
// --------------------------------------------------

const TITLE_DATA = {
  name: "Avengers: Endgame",

  description:
    "After the devastating events of the Infinity War, the surviving Avengers struggle with loss and the consequences of Thanos's victory. When a new opportunity emerges, they reunite to attempt an extraordinary plan involving time travel, the Infinity Stones, and a final confrontation that will decide the fate of the universe.",

  genre: ["Action", "Adventure", "Science Fiction"],

  releaseYear: 2019,

  duration: 11090,
};

// --------------------------------------------------
// FILE VALIDATION
// --------------------------------------------------

function assertFileExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }

  if (!fs.statSync(filePath).isFile()) {
    throw new Error(`${label} is not a file: ${filePath}`);
  }
}

// --------------------------------------------------
// DATASET HELPERS
// --------------------------------------------------

function getField(block, fieldName) {
  const escapedName = fieldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const match = block.match(
    new RegExp(`^\\s*${escapedName}:\\s*(.*?)\\s*$`, "m"),
  );

  return match?.[1]?.trim() || null;
}

function parseOptions(block, eventId) {
  const optionsStart = block.indexOf("options:");

  if (optionsStart === -1) {
    return [];
  }

  const optionsLines = block.slice(optionsStart).split(/\r?\n/).slice(1);

  const options = [];
  let currentOption = null;

  for (const line of optionsLines) {
    const idMatch = line.match(/^\s*-\s*id:\s*(.+)$/);

    const labelMatch = line.match(/^\s*label:\s*(.+)$/);

    if (idMatch) {
      if (currentOption) {
        options.push(currentOption);
      }

      currentOption = {
        id: idMatch[1].trim(),
      };

      continue;
    }

    if (labelMatch && currentOption) {
      currentOption.label = labelMatch[1].trim();
    }
  }

  if (currentOption) {
    options.push(currentOption);
  }

  if (options.some((option) => !option.id || !option.label)) {
    throw new Error(`Invalid option data in event "${eventId}".`);
  }

  return options;
}

// --------------------------------------------------
// DATASET PARSER
// --------------------------------------------------

function parseDataset(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");

  // Parse character master data.
  const characterSection = raw.match(
    /2\.\s*CHARACTER MASTER DATA([\s\S]*?)3\.\s*TIMELINE METADATA/i,
  );

  if (!characterSection) {
    throw new Error("Character master data section not found.");
  }

  const characters = new Map();

  for (const line of characterSection[1].split(/\r?\n/)) {
    const match = line.trim().match(/^(c_[\w]+)\s*\|\s*(.+)$/);

    if (match) {
      characters.set(match[1], match[2].trim());
    }
  }

  if (characters.size !== 27) {
    throw new Error(`Expected 27 characters, found ${characters.size}.`);
  }

  // Parse timeline events.
  const timelineSection = raw.match(
    /TIMELINE EVENTS([\s\S]*?)SOURCE VALIDATION NOTE/i,
  );

  if (!timelineSection) {
    throw new Error("Timeline events section not found.");
  }

  const blocks = timelineSection[1].split(/\r?\n(?=\[\d{3}\])/);

  const timeline = [];

  for (const block of blocks) {
    const eventId = getField(block, "eventId");

    if (!eventId) {
      continue;
    }

    const eventType = getField(block, "eventType");

    const startTime = Number(getField(block, "startTime"));

    const endTime = Number(getField(block, "endTime"));

    const text = getField(block, "text");

    const event = {
      eventId,
      eventType,
      startTime,
      endTime,
      text,
    };

    // Character appearance data.
    const characterId = getField(block, "characterId");

    if (characterId) {
      const characterName = characters.get(characterId);

      if (!characterName) {
        throw new Error(
          `Unknown characterId "${characterId}" in event "${eventId}".`,
        );
      }

      event.characterId = characterId;
      event.characterName = characterName;
    }

    // Variation point data.
    const variationId = getField(block, "variationId");

    if (variationId) {
      event.variationId = variationId;

      event.options = parseOptions(block, eventId);
    }

    timeline.push(event);
  }

  validateTimeline(timeline);

  return {
    characters,
    timeline,
  };
}

// --------------------------------------------------
// TIMELINE VALIDATION
// --------------------------------------------------

function validateTimeline(timeline) {
  if (timeline.length !== 78) {
    throw new Error(`Expected 78 timeline events, found ${timeline.length}.`);
  }

  const eventIds = new Set();
  const variationIds = new Set();

  for (const event of timeline) {
    if (!event.eventId || eventIds.has(event.eventId)) {
      throw new Error(`Missing or duplicate eventId: ${event.eventId}`);
    }

    eventIds.add(event.eventId);

    if (!TIMELINE_EVENT_TYPES.includes(event.eventType)) {
      throw new Error(
        `Invalid eventType "${event.eventType}" in ${event.eventId}.`,
      );
    }

    if (
      !Number.isFinite(event.startTime) ||
      !Number.isFinite(event.endTime) ||
      event.startTime < 0 ||
      event.endTime < event.startTime ||
      event.endTime > TITLE_DATA.duration
    ) {
      throw new Error(`Invalid time range in ${event.eventId}.`);
    }

    if (!event.text) {
      throw new Error(`Missing text in ${event.eventId}.`);
    }

    if (event.eventType === "characterAppearance" && !event.characterId) {
      throw new Error(`Missing characterId in ${event.eventId}.`);
    }

    if (event.eventType === "variationPoint") {
      if (!event.variationId || variationIds.has(event.variationId)) {
        throw new Error(
          `Missing or duplicate variationId in ${event.eventId}.`,
        );
      }

      variationIds.add(event.variationId);

      if (!event.options || event.options.length < 2) {
        throw new Error(
          `At least two options are required in ${event.eventId}.`,
        );
      }

      const optionIds = new Set();

      for (const option of event.options) {
        if (!option.id || !option.label || optionIds.has(option.id)) {
          throw new Error(`Invalid or duplicate option in ${event.eventId}.`);
        }

        optionIds.add(option.id);
      }
    }
  }

  console.log("Timeline validation passed.");
  console.log("Unique events:", eventIds.size);
  console.log("Variation points:", variationIds.size);
}

// --------------------------------------------------
// MINIO CLIENT
// --------------------------------------------------

function createMinioClient() {
  const required = [
    "MINIO_ENDPOINT",
    "MINIO_BUCKET",
    "NETFLIX_MINIO_ROOT_USER",
    "NETFLIX_MINIO_ROOT_PASSWORD",
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`${key} is missing from the root .env file.`);
    }
  }

  return new S3Client({
    endpoint: process.env.MINIO_ENDPOINT,

    region: process.env.MINIO_REGION || "us-east-1",

    forcePathStyle: true,

    credentials: {
      accessKeyId: process.env.NETFLIX_MINIO_ROOT_USER,

      secretAccessKey: process.env.NETFLIX_MINIO_ROOT_PASSWORD,
    },
  });
}

// --------------------------------------------------
// STREAMING FILE UPLOAD
// --------------------------------------------------

async function uploadFile(client, filePath, key, contentType) {
  console.log(`Uploading: ${path.basename(filePath)}`);

  const uploader = new Upload({
    client,

    params: {
      Bucket: process.env.MINIO_BUCKET,
      Key: key,
      Body: fs.createReadStream(filePath),
      ContentType: contentType,
    },

    queueSize: 4,
    partSize: 10 * 1024 * 1024,
    leavePartsOnError: false,
  });

  await uploader.done();

  console.log(`Uploaded successfully: ${key}`);
}

// --------------------------------------------------
// MAIN SEED FUNCTION
// --------------------------------------------------

async function seed() {
  // Check required local files.
  assertFileExists(VIDEO_PATH, "Video");
  assertFileExists(THUMBNAIL_PATH, "Thumbnail");
  assertFileExists(DATASET_PATH, "Dataset");

  const videoStats = fs.statSync(VIDEO_PATH);
  const thumbnailStats = fs.statSync(THUMBNAIL_PATH);

  console.log("Video size:", (videoStats.size / 1024 ** 3).toFixed(2), "GB");

  console.log("Thumbnail size:", (thumbnailStats.size / 1024).toFixed(2), "KB");

  // Parse and validate dataset before uploading.
  const { timeline, characters } = parseDataset(DATASET_PATH);

  console.log("Characters parsed:", characters.size);
  console.log("Timeline events validated:", timeline.length);

  // Find admin user.
  const admin = await User.findOne({
    role: "admin",
  }).select("_id");

  if (!admin) {
    throw new Error("No admin user found. Create an admin before seeding.");
  }

  const minioClient = createMinioClient();

  try {
    // Confirm bucket exists.
    await minioClient.send(
      new HeadBucketCommand({
        Bucket: process.env.MINIO_BUCKET,
      }),
    );

    console.log("MinIO bucket verified.");

    // Upload original MKV video.
    await uploadFile(minioClient, VIDEO_PATH, VIDEO_KEY, "video/x-matroska");

    // Upload thumbnail.
    await uploadFile(minioClient, THUMBNAIL_PATH, THUMBNAIL_KEY, "image/jpeg");

    // Prepare Title document.
    const titlePayload = {
      ...TITLE_DATA,

      videoKey: VIDEO_KEY,
      thumbnailKey: THUMBNAIL_KEY,

      timeline,

      isPublished: true,

      createdBy: admin._id,
    };

    // Update existing Title or create a new one.
    const existingTitle = await Title.findOne({
      name: TITLE_DATA.name,
    });

    if (existingTitle) {
      Object.assign(existingTitle, titlePayload);

      await existingTitle.save();

      console.log("Existing title updated:", existingTitle._id.toString());
    } else {
      const createdTitle = await Title.create(titlePayload);

      console.log("New title created:", createdTitle._id.toString());
    }

    console.log("Avengers: Endgame seed completed successfully.");

    console.log("Video key:", VIDEO_KEY);
    console.log("Thumbnail key:", THUMBNAIL_KEY);
  } finally {
    minioClient.destroy();
  }
}

// --------------------------------------------------
// EXECUTION
// --------------------------------------------------

try {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing from the root .env file.");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  console.log("MongoDB connected.");

  await seed();
} catch (error) {
  console.error("Seed failed:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
