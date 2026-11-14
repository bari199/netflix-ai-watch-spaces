import minioClient, { MINIO_BUCKET } from "../config/minio.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "node:crypto";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const ALLOWED_HOSTS = ["googleusercontent.com", "fbcdn.net", "fbsbx.com"];

const isAllowedHost = (hostname) =>
  ALLOWED_HOSTS.some(
    (host) => hostname === host || hostname.endsWith(`.${host}`),
  );

const getPublicAvatarUrl = (key) => {
  const publicUrl = process.env.MINIO_ENDPOINT;

  if (!publicUrl) {
    throw new Error("MINIO_ENDPOINT is not configured");
  }

  return `${publicUrl.replace(/\/$/, "")}/${MINIO_BUCKET}/${key}`;
};

// ==========================================
// Google / Facebook OAuth Avatar
// ==========================================

export const uploadAvatarFromUrl = async (imageUrl, provider) => {
  if (!imageUrl) return "";

  const parsedUrl = new URL(imageUrl);

  if (parsedUrl.protocol !== "https:" || !isAllowedHost(parsedUrl.hostname)) {
    throw new Error("Unsupported avatar image URL");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(imageUrl, {
      signal: controller.signal,
      redirect: "error",
    });

    if (!response.ok) {
      throw new Error(`Avatar download failed: ${response.status}`);
    }

    const finalUrl = new URL(response.url);

    if (finalUrl.protocol !== "https:" || !isAllowedHost(finalUrl.hostname)) {
      throw new Error("Avatar redirect destination is not allowed");
    }

    const contentType = response.headers
      .get("content-type")
      ?.split(";")[0]
      .trim()
      .toLowerCase();

    const extension = ALLOWED_TYPES[contentType];

    if (!extension) {
      throw new Error("Unsupported avatar image format");
    }

    const contentLength = Number(response.headers.get("content-length") || 0);

    if (contentLength > MAX_AVATAR_SIZE) {
      throw new Error("Avatar image exceeds 5MB");
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (!buffer.length || buffer.length > MAX_AVATAR_SIZE) {
      throw new Error("Invalid avatar image size");
    }

    const key = `avatars/${provider}/${crypto.randomUUID()}.${extension}`;

    await minioClient.send(
      new PutObjectCommand({
        Bucket: MINIO_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ContentLength: buffer.length,
        CacheControl: "public, max-age=31536000",
      }),
    );

    return getPublicAvatarUrl(key);
  } finally {
    clearTimeout(timeout);
  }
};

// ==========================================
// Local Registration Avatar Upload
// ==========================================

export const uploadAvatarBuffer = async (file) => {
  if (!file) return "";

  if (file.size > MAX_AVATAR_SIZE) {
    throw new Error("Avatar image exceeds 5MB");
  }

  const extension = ALLOWED_TYPES[file.mimetype];

  if (!extension) {
    throw new Error("Unsupported avatar image format");
  }

  const key = `avatars/local/${crypto.randomUUID()}.${extension}`;

  await minioClient.send(
    new PutObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentLength: file.size,
      CacheControl: "public, max-age=31536000",
    }),
  );

  return getPublicAvatarUrl(key);
};
