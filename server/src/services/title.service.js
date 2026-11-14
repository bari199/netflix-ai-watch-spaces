import Title from "../models/Title.js";

import { randomUUID } from "node:crypto";

import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

import minioClient, { MINIO_BUCKET } from "../config/minio.js";

// Upload file to MinIO
const uploadToMinIO = async (key, file) => {
  await minioClient.send(
    new PutObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }),
  );
};

// Delete file from MinIO
const deleteFromMinIO = async (key) => {
  if (!key) return;

  await minioClient.send(
    new DeleteObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: key,
    }),
  );
};

// Create a new title and upload video and thumbnail to MinIO
export const createTitle = async (
  titleData,
  userId,
  videoFile,
  thumbnailFile,
) => {
  if (!videoFile) {
    throw new Error("Video file is required");
  }

  const videoExtensions = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  };

  const imageExtensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  const videoExtension = videoExtensions[videoFile.mimetype];

  if (!videoExtension) {
    throw new Error("Unsupported video format");
  }

  let thumbnailExtension;

  if (thumbnailFile) {
    thumbnailExtension = imageExtensions[thumbnailFile.mimetype];

    if (!thumbnailExtension) {
      throw new Error("Unsupported thumbnail format");
    }
  }

  const videoKey = `videos/${randomUUID()}.${videoExtension}`;

  const thumbnailKey = thumbnailFile
    ? `thumbnails/${randomUUID()}.${thumbnailExtension}`
    : "";

  try {
    // Upload video
    await uploadToMinIO(videoKey, videoFile);

    // Upload thumbnail if provided
    if (thumbnailFile) {
      await uploadToMinIO(thumbnailKey, thumbnailFile);
    }

    // Save title in MongoDB
    const title = await Title.create({
      ...titleData,
      videoKey,
      thumbnailKey,
      createdBy: userId,
    });

    return title;
  } catch (error) {
    // Cleanup uploaded files if creation fails
    await Promise.allSettled([
      deleteFromMinIO(videoKey),
      deleteFromMinIO(thumbnailKey),
    ]);

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

  const { thumbnailFile, ...titleUpdates } = updates;

  const updateFields = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(titleUpdates, field)) {
      updateFields[field] = titleUpdates[field];
    }
  }

  const invalidFields = Object.keys(titleUpdates).filter(
    (field) => !allowedFields.includes(field),
  );

  if (invalidFields.length > 0) {
    throw new Error("One or more update fields are not allowed");
  }

  if (Object.keys(updateFields).length === 0 && !thumbnailFile) {
    throw new Error("Please provide valid title update data");
  }

  let newThumbnailKey = null;
  let oldThumbnailKey = null;

  try {
    if (thumbnailFile) {
      const imageExtensions = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      };

      const extension = imageExtensions[thumbnailFile.mimetype];

      if (!extension) {
        throw new Error("Unsupported thumbnail format");
      }

      newThumbnailKey = `thumbnails/${randomUUID()}.${extension}`;

      await uploadToMinIO(newThumbnailKey, thumbnailFile);
    }

    const existingTitle = await Title.findById(titleId);

    if (!existingTitle) {
      throw new Error("Title not found");
    }

    oldThumbnailKey = existingTitle.thumbnailKey;

    if (newThumbnailKey) {
      updateFields.thumbnailKey = newThumbnailKey;
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

    // Delete old thumbnail only after successful database update
    if (
      newThumbnailKey &&
      oldThumbnailKey &&
      oldThumbnailKey !== newThumbnailKey
    ) {
      try {
        await deleteFromMinIO(oldThumbnailKey);
      } catch (cleanupError) {
        console.error("Old thumbnail cleanup failed:", cleanupError.message);
      }
    }

    return title;
  } catch (error) {
    // Remove newly uploaded thumbnail if update fails
    if (newThumbnailKey) {
      try {
        await deleteFromMinIO(newThumbnailKey);
      } catch (cleanupError) {
        console.error("New thumbnail cleanup failed:", cleanupError.message);
      }
    }

    throw error;
  }
};

// Delete title and its video and thumbnail from MinIO
export const deleteTitle = async (titleId) => {
  const title = await Title.findById(titleId);

  if (!title) {
    throw new Error("Title not found");
  }

  // Delete video and thumbnail from MinIO
  await Promise.all([
    deleteFromMinIO(title.videoKey),
    deleteFromMinIO(title.thumbnailKey),
  ]);

  // Delete title from MongoDB
  await Title.findByIdAndDelete(titleId);

  return title;
};

// Get title thumbnail from MinIO
export const getTitleThumbnail = async (titleId) => {
  const title = await Title.findById(titleId).select("thumbnailKey");

  if (!title) {
    throw new Error("Title not found");
  }

  if (!title.thumbnailKey) {
    throw new Error("Thumbnail not found");
  }

  const result = await minioClient.send(
    new GetObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: title.thumbnailKey,
    }),
  );

  return result;
};

// Get video metadata and stream from MinIO with HTTP Range support
export const getTitleVideo = async (titleId, rangeHeader) => {
  const title = await Title.findOne({
    _id: titleId,
    isPublished: true,
  }).select("videoKey");

  if (!title) {
    throw new Error("Title not found");
  }

  if (!title.videoKey) {
    throw new Error("Video not found");
  }

  const objectParams = {
    Bucket: MINIO_BUCKET,
    Key: title.videoKey,
  };

  const metadata = await minioClient.send(new HeadObjectCommand(objectParams));

  const fileSize = metadata.ContentLength;

  if (!Number.isSafeInteger(fileSize) || fileSize <= 0) {
    throw new Error("Invalid video file size");
  }

  let range;

  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());

    if (!match || (!match[1] && !match[2])) {
      const error = new Error("Invalid video range");
      error.statusCode = 416;
      error.contentRange = `bytes */${fileSize}`;
      throw error;
    }

    let start;
    let end;

    if (!match[1]) {
      const suffixLength = Number(match[2]);

      if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
        const error = new Error("Invalid video range");
        error.statusCode = 416;
        error.contentRange = `bytes */${fileSize}`;
        throw error;
      }

      start = Math.max(fileSize - suffixLength, 0);
      end = fileSize - 1;
    } else {
      start = Number(match[1]);
      end = match[2] ? Number(match[2]) : fileSize - 1;
    }

    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 0 ||
      start >= fileSize ||
      end < start
    ) {
      const error = new Error("Requested video range is not satisfiable");
      error.statusCode = 416;
      error.contentRange = `bytes */${fileSize}`;
      throw error;
    }

    end = Math.min(end, fileSize - 1);
    range = `bytes=${start}-${end}`;
  }

  const result = await minioClient.send(
    new GetObjectCommand({
      ...objectParams,
      ...(range ? { Range: range } : {}),
    }),
  );

  return {
    Body: result.Body,
    ContentType:
      result.ContentType || metadata.ContentType || "application/octet-stream",
    ContentLength: result.ContentLength,
    ContentRange: result.ContentRange,
    AcceptRanges: "bytes",
    FileSize: fileSize,
  };
};
