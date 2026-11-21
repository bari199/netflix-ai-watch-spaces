import mongoose from "mongoose";
import Title, { TIMELINE_EVENT_TYPES } from "../models/Title.js";

import { randomUUID } from "node:crypto";

import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

import minioClient, { MINIO_BUCKET } from "../config/minio.js";

const SUPPORTED_TIMELINE_EVENT_TYPES = new Set(TIMELINE_EVENT_TYPES);

const isNonblankString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const toFiniteNumber = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim()) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  return null;
};

const throwTimelineValidationError = (path, message) => {
  const error = new mongoose.Error.ValidationError();
  error.addError(path, new mongoose.Error.ValidatorError({ path, message }));
  throw error;
};

export const validateTimelineMetadata = (timeline, duration) => {
  if (timeline === undefined) {
    return;
  }

  if (!Array.isArray(timeline)) {
    throwTimelineValidationError("timeline", "Timeline must be an array");
  }

  if (timeline.length === 0) {
    return;
  }

  const titleDuration = toFiniteNumber(duration);

  if (titleDuration === null || titleDuration <= 0) {
    throwTimelineValidationError(
      "duration",
      "Title duration must be a positive finite number",
    );
  }

  const eventIds = new Set();

  for (const [index, event] of timeline.entries()) {
    const path = `timeline.${index}`;

    if (!event || typeof event !== "object" || Array.isArray(event)) {
      throwTimelineValidationError(path, "Timeline event must be an object");
    }

    const eventType =
      typeof event.eventType === "string" ? event.eventType.trim() : "";

    if (!SUPPORTED_TIMELINE_EVENT_TYPES.has(eventType)) {
      throwTimelineValidationError(
        `${path}.eventType`,
        "Timeline event type is not supported",
      );
    }

    if (!isNonblankString(event.eventId)) {
      throwTimelineValidationError(
        `${path}.eventId`,
        "Timeline event ID is required",
      );
    }

    const normalizedEventId = event.eventId.trim();

    if (eventIds.has(normalizedEventId)) {
      throwTimelineValidationError(
        `${path}.eventId`,
        "Timeline event IDs must be unique within a Title",
      );
    }

    eventIds.add(normalizedEventId);

    const startTime = toFiniteNumber(event.startTime);
    const endTime = toFiniteNumber(event.endTime);

    if (
      startTime === null ||
      endTime === null ||
      startTime < 0 ||
      endTime < 0
    ) {
      throwTimelineValidationError(
        path,
        "Timeline timestamps must be finite and nonnegative",
      );
    }

    if (endTime < startTime) {
      throwTimelineValidationError(
        `${path}.endTime`,
        "Timeline endTime must be greater than or equal to startTime",
      );
    }

    if (endTime > titleDuration) {
      throwTimelineValidationError(
        `${path}.endTime`,
        "Timeline event cannot end after the Title duration",
      );
    }

    const content =
      event.text !== undefined && event.text !== null
        ? event.text
        : event.description;

    if (!isNonblankString(content)) {
      throwTimelineValidationError(
        `${path}.text`,
        "Timeline event text or legacy description is required",
      );
    }

    if (
      eventType === "characterAppearance" &&
      !isNonblankString(event.characterId)
    ) {
      throwTimelineValidationError(
        `${path}.characterId`,
        "Character appearance events require a characterId",
      );
    }

    if (eventType === "variationPoint") {
      if (!isNonblankString(event.variationId)) {
        throwTimelineValidationError(
          `${path}.variationId`,
          "Variation points require a variationId",
        );
      }

      if (!Array.isArray(event.options) || event.options.length < 2) {
        throwTimelineValidationError(
          `${path}.options`,
          "Variation points require at least two options",
        );
      }

      const optionIds = new Set();

      for (const [optionIndex, option] of event.options.entries()) {
        if (
          !option ||
          typeof option !== "object" ||
          !isNonblankString(option.id) ||
          !isNonblankString(option.label)
        ) {
          throwTimelineValidationError(
            `${path}.options.${optionIndex}`,
            "Variation options require nonblank IDs and labels",
          );
        }

        const normalizedOptionId = option.id.trim();

        if (optionIds.has(normalizedOptionId)) {
          throwTimelineValidationError(
            `${path}.options.${optionIndex}.id`,
            "Variation option IDs must be unique within a variation point",
          );
        }

        optionIds.add(normalizedOptionId);
      }
    }
  }
};

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

const deleteAssetIfUnreferenced = async (field, key, titleId) => {
  if (!key) return;

  const referencedTitle = await Title.exists({
    [field]: key,
    _id: { $ne: titleId },
  });

  if (referencedTitle) {
    return;
  }

  await deleteFromMinIO(key);
};

const cleanupUncommittedAsset = async (field, key, titleId) => {
  if (!key) return;

  try {
    const titleQuery = Title.findById(titleId);
    const savedTitle =
      typeof titleQuery.select === "function"
        ? await titleQuery.select(field)
        : await titleQuery;

    if (savedTitle?.[field] === key) {
      return;
    }

    await deleteAssetIfUnreferenced(field, key, titleId);
  } catch (cleanupError) {
    console.error(
      `Could not safely clean up new ${field} asset:`,
      cleanupError.message,
    );
  }
};

const cleanupSubtitleKeys = async (keys) => {
  const results = await Promise.allSettled(
    keys.map((key) => deleteFromMinIO(key)),
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Subtitle asset cleanup failed:", result.reason?.message);
    }
  }
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

  validateTimelineMetadata(titleData?.timeline, titleData?.duration);

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
    .select("-timeline -subtitleVariants.storageKey")
    .sort({ createdAt: -1 });
};

// Get a single published title
export const getTitleById = async (titleId) => {
  const title = await Title.findOne({
    _id: titleId,
    isPublished: true,
  }).select("-subtitleVariants.storageKey");

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

  const { videoFile, thumbnailFile, ...titleUpdates } = updates;

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

  if (Object.keys(updateFields).length === 0 && !videoFile && !thumbnailFile) {
    throw new Error("Please provide valid title update data");
  }

  let newVideoKey = null;
  let oldVideoKey = null;
  let newThumbnailKey = null;
  let oldThumbnailKey = null;

  try {
    const existingTitle = await Title.findById(titleId);

    if (!existingTitle) {
      throw new Error("Title not found");
    }

    const nextTimeline = Object.prototype.hasOwnProperty.call(
      titleUpdates,
      "timeline",
    )
      ? titleUpdates.timeline
      : existingTitle.timeline;
    const nextDuration = Object.prototype.hasOwnProperty.call(
      titleUpdates,
      "duration",
    )
      ? titleUpdates.duration
      : existingTitle.duration;

    validateTimelineMetadata(nextTimeline, nextDuration);

    if (videoFile) {
      const videoExtensions = {
        "video/mp4": "mp4",
        "video/webm": "webm",
        "video/quicktime": "mov",
      };
      const extension = videoExtensions[videoFile.mimetype];

      if (!extension) {
        throw new Error("Unsupported video format");
      }

      newVideoKey = `videos/${randomUUID()}.${extension}`;
      await uploadToMinIO(newVideoKey, videoFile);
    }

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

    oldVideoKey = existingTitle.videoKey;
    oldThumbnailKey = existingTitle.thumbnailKey;

    if (newVideoKey) {
      updateFields.videoKey = newVideoKey;
    }

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

    if (
      (newVideoKey && title.videoKey !== newVideoKey) ||
      (newThumbnailKey && title.thumbnailKey !== newThumbnailKey)
    ) {
      throw new Error("Updated title asset references were not persisted");
    }

    // Keep old media available until the new storage key is persisted.
    if (newVideoKey && oldVideoKey && oldVideoKey !== newVideoKey) {
      try {
        await deleteAssetIfUnreferenced("videoKey", oldVideoKey, titleId);
      } catch (cleanupError) {
        console.error("Old video cleanup failed:", cleanupError.message);
      }
    }

    if (
      newThumbnailKey &&
      oldThumbnailKey &&
      oldThumbnailKey !== newThumbnailKey
    ) {
      try {
        await deleteAssetIfUnreferenced(
          "thumbnailKey",
          oldThumbnailKey,
          titleId,
        );
      } catch (cleanupError) {
        console.error("Old thumbnail cleanup failed:", cleanupError.message);
      }
    }

    return title;
  } catch (error) {
    // A failed response can follow a committed DB write; confirm the key is unreferenced first.
    await Promise.all([
      cleanupUncommittedAsset("videoKey", newVideoKey, titleId),
      cleanupUncommittedAsset("thumbnailKey", newThumbnailKey, titleId),
    ]);

    throw error;
  }
};

export const updateTitleSubtitleVariants = async (
  titleId,
  variants,
  subtitleFiles = [],
) => {
  if (!Array.isArray(variants) || !Array.isArray(subtitleFiles)) {
    throw new Error("Subtitle variants and files must be arrays");
  }

  const title = await Title.findById(titleId);

  if (!title) {
    throw new Error("Title not found");
  }

  const existingById = new Map(
    (title.subtitleVariants || []).map((variant) => [
      String(variant.variantId),
      variant,
    ]),
  );
  const referencedFiles = new Set();
  const variantIds = new Set();
  const identities = new Set();
  const prepared = [];

  for (const [index, input] of variants.entries()) {
    const path = `subtitleVariants.${index}`;

    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error(`${path} must be an object`);
    }

    const locale = typeof input.locale === "string" ? input.locale.trim() : "";
    const label = typeof input.label === "string" ? input.label.trim() : "";

    if (
      !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale) ||
      !label ||
      label.length > 100
    ) {
      throw new Error(`${path} requires a valid locale and label`);
    }

    const variantId =
      typeof input.variantId === "string" ? input.variantId.trim() : "";

    if (variantId && variantIds.has(variantId)) {
      throw new Error("Subtitle variant IDs must be unique");
    }
    if (variantId) variantIds.add(variantId);

    const eventId =
      typeof input.eventId === "string" && input.eventId.trim()
        ? input.eventId.trim()
        : null;
    const variationId =
      typeof input.variationId === "string" && input.variationId.trim()
        ? input.variationId.trim()
        : null;
    const optionId =
      typeof input.optionId === "string" && input.optionId.trim()
        ? input.optionId.trim()
        : null;

    if (eventId && !title.timeline.some((event) => event.eventId === eventId)) {
      throw new Error(`${path} references an unknown timeline event`);
    }

    if (optionId && !variationId) {
      throw new Error(`${path} requires variationId when optionId is set`);
    }

    if (variationId) {
      const variation = title.timeline.find(
        (event) =>
          event.eventType === "variationPoint" &&
          event.variationId === variationId,
      );

      if (
        !variation ||
        !optionId ||
        !variation.options.some((option) => option.id === optionId)
      ) {
        throw new Error(`${path} references an unknown variation option`);
      }
    }

    const identity = [
      locale.toLowerCase(),
      eventId || "",
      variationId || "",
      optionId || "",
    ].join(":");

    if (identities.has(identity)) {
      throw new Error("Subtitle variants must have unique locale associations");
    }
    identities.add(identity);

    let file = null;
    if (input.fileIndex !== undefined) {
      const fileIndex = input.fileIndex;

      if (
        !Number.isInteger(fileIndex) ||
        fileIndex < 0 ||
        fileIndex >= subtitleFiles.length ||
        referencedFiles.has(fileIndex)
      ) {
        throw new Error(`${path} has an invalid subtitle file reference`);
      }
      referencedFiles.add(fileIndex);
      file = subtitleFiles[fileIndex];
    }

    const existing = variantId ? existingById.get(variantId) : null;
    if (variantId && !existing) {
      throw new Error(`${path} references an unknown subtitle variant`);
    }
    if (!file && !existing) {
      throw new Error(`${path} requires a WebVTT subtitle file`);
    }

    prepared.push({
      variantId: existing?.variantId || variantId || randomUUID(),
      locale,
      label,
      eventId,
      variationId,
      optionId,
      existing,
      file,
    });
  }

  if (referencedFiles.size !== subtitleFiles.length) {
    throw new Error(
      "Every uploaded subtitle file must be assigned to a variant",
    );
  }

  const uploadedKeys = [];

  try {
    const storedVariants = [];

    for (const variant of prepared) {
      let storageKey = variant.existing?.storageKey;

      if (variant.file) {
        if (
          !variant.file.originalname.toLowerCase().endsWith(".vtt") ||
          !["text/vtt", "application/octet-stream"].includes(
            variant.file.mimetype,
          )
        ) {
          throw new Error("Subtitle files must be WebVTT (.vtt)");
        }

        storageKey = `subtitles/${randomUUID()}.vtt`;
        uploadedKeys.push(storageKey);
        await uploadToMinIO(storageKey, {
          ...variant.file,
          mimetype: "text/vtt",
        });
      }

      storedVariants.push({
        variantId: variant.variantId,
        locale: variant.locale,
        label: variant.label,
        storageKey,
        eventId: variant.eventId,
        variationId: variant.variationId,
        optionId: variant.optionId,
      });
    }

    const removedKeys = (title.subtitleVariants || [])
      .filter(
        (existing) =>
          !storedVariants.some(
            (variant) => variant.variantId === existing.variantId,
          ) ||
          storedVariants.some(
            (variant) =>
              variant.variantId === existing.variantId &&
              variant.storageKey !== existing.storageKey,
          ),
      )
      .map((variant) => variant.storageKey)
      .filter(Boolean);

    title.subtitleVariants = storedVariants;
    await title.save();

    await cleanupSubtitleKeys(removedKeys);
    return title;
  } catch (error) {
    await cleanupSubtitleKeys(uploadedKeys);
    throw error;
  }
};

export const getTitleSubtitle = async (titleId, variantId) => {
  const title = await Title.findOne({
    _id: titleId,
    isPublished: true,
  }).select("subtitleVariants");

  const variant = title?.subtitleVariants?.find(
    (item) => item.variantId === variantId,
  );

  if (!variant) {
    throw new Error("Subtitle variant not found");
  }

  return minioClient.send(
    new GetObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: variant.storageKey,
    }),
  );
};

// Delete title and its video and thumbnail from MinIO
export const deleteTitle = async (titleId) => {
  const title = await Title.findById(titleId);

  if (!title) {
    throw new Error("Title not found");
  }

  const deletedTitle = await Title.findByIdAndDelete(titleId);

  if (!deletedTitle) {
    throw new Error("Title not found");
  }

  const assets = [
    ["videoKey", title.videoKey],
    ["thumbnailKey", title.thumbnailKey],
    ...(title.subtitleVariants || []).map((variant) => [
      "subtitleVariants.storageKey",
      variant.storageKey,
    ]),
  ];

  const cleanupResults = await Promise.allSettled(
    assets.map(([field, key]) =>
      deleteAssetIfUnreferenced(field, key, titleId),
    ),
  );

  for (const result of cleanupResults) {
    if (result.status === "rejected") {
      console.error(
        "Deleted Title asset cleanup failed:",
        result.reason?.message,
      );
    }
  }

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

// Create a draft title — always remains unpublished
export const createDraftTitle = async (
  titleData,
  userId,
  videoFile,
  thumbnailFile,
) => {
  return createTitle(
    {
      ...titleData,
      isPublished: false,
    },
    userId,
    videoFile,
    thumbnailFile,
  );
};

// Get all draft titles
export const getDraftTitles = async () => {
  return Title.find({ isPublished: false })
    .select("-subtitleVariants.storageKey")
    .sort({ updatedAt: -1 });
};

// Get a single draft title by ID
export const getDraftTitleById = async (titleId) => {
  const title = await Title.findOne({
    _id: titleId,
    isPublished: false,
  }).select("-subtitleVariants.storageKey");

  if (!title) {
    throw new Error("Draft title not found");
  }

  return title;
};


// Update an existing draft without allowing it to be published
export const updateDraftTitle = async (titleId, updates) => {
  if (
    !updates ||
    typeof updates !== "object" ||
    Array.isArray(updates) ||
    Object.prototype.hasOwnProperty.call(updates, "isPublished")
  ) {
    throw new Error("Invalid draft update data");
  }

  const draft = await Title.findOne({
    _id: titleId,
    isPublished: false,
  });

  if (!draft) {
    throw new Error("Draft title not found");
  }

  return updateTitle(titleId, updates);
};

// Publish an existing draft
export const publishDraftTitle = async (titleId) => {
  const title = await Title.findOneAndUpdate(
    {
      _id: titleId,
      isPublished: false,
    },
    {
      $set: { isPublished: true },
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  );

  if (!title) {
    throw new Error("Draft title not found or already published");
  }

  return title;
};
