import { randomUUID } from "node:crypto";
import User from "../models/User.js";
import minioClient, { MINIO_BUCKET } from "../config/minio.js";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

// Update user profile and notification preferences
export const updateUserProfile = async (
  userId,
  { name, notificationPreferences } = {},
) => {
  const updates = {};

  if (name !== undefined) {
    if (typeof name !== "string") {
      throw new Error("Name must be a string");
    }

    const normalizedName = name.trim();

    if (!normalizedName) {
      throw new Error("Name cannot be empty");
    }

    updates.name = normalizedName;
  }

  if (notificationPreferences !== undefined) {
    if (
      !notificationPreferences ||
      typeof notificationPreferences !== "object" ||
      Array.isArray(notificationPreferences)
    ) {
      throw new Error("Invalid notification preferences");
    }

    const allowedKeys = ["soundEnabled", "vibrationEnabled"];
    const providedKeys = Object.keys(notificationPreferences);

    if (
      providedKeys.length === 0 ||
      providedKeys.some((key) => !allowedKeys.includes(key))
    ) {
      throw new Error("Invalid notification preference fields");
    }

    for (const key of providedKeys) {
      if (typeof notificationPreferences[key] !== "boolean") {
        throw new Error(`${key} must be a boolean`);
      }

      updates[`notificationPreferences.${key}`] = notificationPreferences[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("No valid profile fields provided");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updates },
    {
      returnDocument: "after",
      runValidators: true,
    },
  ).select(
    "_id name email avatar role isEmailVerified authProvider notificationPreferences",
  );

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

// Upload user avatar to MinIO
export const uploadUserAvatar = async (userId, file) => {
  if (!file || !file.buffer) {
    throw new Error("Avatar image is required");
  }

  const extensionByMimeType = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  const extension = extensionByMimeType[file.mimetype];

  if (!extension) {
    throw new Error("Unsupported avatar image format");
  }

  const objectKey = `avatars/${userId}/${randomUUID()}.${extension}`;

  await minioClient.send(
    new PutObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: objectKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    }),
  );

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { avatar: objectKey } },
    {
      returnDocument: "after",
      runValidators: true,
    },
  ).select(
    "_id name email avatar role isEmailVerified authProvider notificationPreferences",
  );

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

// Retrieve user avatar from MinIO
export const getUserAvatar = async (userId) => {
  const user = await User.findById(userId).select("avatar");

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.avatar) {
    throw new Error("Avatar not found");
  }

  const result = await minioClient.send(
    new GetObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: user.avatar,
    }),
  );

  return {
    body: result.Body,
    contentType: result.ContentType || "application/octet-stream",
  };
};
