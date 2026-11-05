import Title from "../models/Title.js";

import { randomUUID } from "node:crypto";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

import minioClient, { MINIO_BUCKET } from "../config/minio.js";

// Create a new title
// Create a new title and upload its video to MinIO
export const createTitle = async (titleData, userId, videoFile) => {
  if (!videoFile) {
    throw new Error("Video file is required");
  }

  const extensionMap = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  };

  const extension = extensionMap[videoFile.mimetype];

  if (!extension) {
    throw new Error("Unsupported video format");
  }

  const videoKey = `videos/${randomUUID()}.${extension}`;

  await minioClient.send(
    new PutObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: videoKey,
      Body: videoFile.buffer,
      ContentType: videoFile.mimetype,
    }),
  );

  try {
    const title = await Title.create({
      ...titleData,
      videoKey,
      createdBy: userId,
    });

    return title;
  } catch (error) {
    // Remove uploaded video if database creation fails
    await minioClient.send(
      new DeleteObjectCommand({
        Bucket: MINIO_BUCKET,
        Key: videoKey,
      }),
    );

    throw error;
  }
};

// Get all published titles
export const getPublishedTitles = async () => {
  return Title.find({ isPublished: true })
    .select("-timeline")
    .sort({ createdAt: -1 });
};

// Get a single published title
export const getTitleById = async (titleId) => {
  const title = await Title.findOne({
    _id: titleId,
    isPublished: true,
  });

  if (!title) {
    throw new Error("Title not found");
  }

  return title;
};

// Update a title
// Update a title
export const updateTitle = async (titleId, updates) => {
  const allowedFields = [
    "name",
    "description",
    "genre",
    "releaseYear",
    "duration",
    "videoKey",
    "thumbnailKey",
    "timeline",
    "isPublished",
  ];

  if (
    !updates ||
    typeof updates !== "object" ||
    Array.isArray(updates) ||
    Object.keys(updates).length === 0
  ) {
    throw new Error("Please provide valid title update data");
  }

  const updateFields = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      updateFields[field] = updates[field];
    }
  }

  if (Object.keys(updateFields).length !== Object.keys(updates).length) {
    throw new Error("One or more update fields are not allowed");
  }

  const title = await Title.findByIdAndUpdate(
    titleId,
    { $set: updateFields },
    {
      returnDocument: "after",
      runValidators: true,
    },
  );

  if (!title) {
    throw new Error("Title not found");
  }

  return title;
};

// Delete a title
// Delete title and its video from MinIO
export const deleteTitle = async (titleId) => {
  const title = await Title.findById(titleId);

  if (!title) {
    throw new Error("Title not found");
  }

  // Delete video from MinIO
  if (title.videoKey) {
    await minioClient.send(
      new DeleteObjectCommand({
        Bucket: MINIO_BUCKET,
        Key: title.videoKey,
      }),
    );
  }

  // Delete title from MongoDB
  await Title.findByIdAndDelete(titleId);

  return title;
};
