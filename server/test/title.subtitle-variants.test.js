import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { Readable } from "node:stream";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import User from "../src/models/User.js";
import Title from "../src/models/Title.js";

const ACCESS_SECRET = "subtitle-variant-test-secret";
const ADMIN_ID = "64f000000000000000000201";
const TITLE_ID = "64f000000000000000000202";
const previousBucket = process.env.MINIO_BUCKET;
process.env.MINIO_BUCKET = "subtitle-variant-test-bucket";
const originalConsoleLog = console.log;
console.log = () => {};
const { default: titleRoutes } = await import("../src/routes/title.routes.js");
const minioClient = (await import("../src/config/minio.js")).default;
console.log = originalConsoleLog;

if (previousBucket === undefined) {
  delete process.env.MINIO_BUCKET;
} else {
  process.env.MINIO_BUCKET = previousBucket;
}

const makeToken = () => jwt.sign({ sub: ADMIN_ID }, ACCESS_SECRET);

const startServer = async (t) => {
  const previousSecret = process.env.ACCESS_TOKEN_SECRET;
  process.env.ACCESS_TOKEN_SECRET = ACCESS_SECRET;
  t.after(() => {
    if (previousSecret === undefined) {
      delete process.env.ACCESS_TOKEN_SECRET;
    } else {
      process.env.ACCESS_TOKEN_SECRET = previousSecret;
    }
  });

  t.mock.method(User, "findById", (userId) => ({
    select: async () => ({ _id: userId, role: "admin" }),
  }));

  const app = express();
  app.use("/api/titles", titleRoutes);
  const server = http.createServer(app);
  server.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
};

const fixtureTitle = () => ({
  timeline: [
    { eventId: "scene-1", eventType: "scene" },
    {
      eventId: "variation-1",
      eventType: "variationPoint",
      variationId: "ending-choice",
      options: [
        { id: "stay", label: "Stay" },
        { id: "leave", label: "Leave" },
      ],
    },
  ],
  subtitleVariants: [],
  async save() {},
});

const createForm = (variants, filename = "captions.vtt") => {
  const form = new FormData();
  form.append("variants", JSON.stringify(variants));
  form.append(
    "subtitleFiles",
    new Blob(["WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHello\n"], {
      type: "text/vtt",
    }),
    filename,
  );
  return form;
};

test("PUT subtitle variants uploads VTT and preserves timeline associations", async (t) => {
  const title = fixtureTitle();
  const storageOperations = [];
  t.mock.method(Title, "findById", async () => title);
  t.mock.method(minioClient, "send", async (command) => {
    storageOperations.push(command);
    return {};
  });

  const baseUrl = await startServer(t);
  const response = await fetch(
    `${baseUrl}/api/titles/${TITLE_ID}/subtitle-variants`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${makeToken()}` },
      body: createForm([
        {
          locale: "fr-FR",
          label: "Français",
          eventId: "scene-1",
          variationId: "ending-choice",
          optionId: "leave",
          fileIndex: 0,
        },
      ]),
    },
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.subtitleVariants.length, 1);
  assert.equal(body.subtitleVariants[0].locale, "fr-FR");
  assert.equal(body.subtitleVariants[0].eventId, "scene-1");
  assert.equal(body.subtitleVariants[0].optionId, "leave");
  assert.equal(body.subtitleVariants[0].storageKey, undefined);
  assert.match(title.subtitleVariants[0].storageKey, /^subtitles\/.+\.vtt$/);
  assert.equal(storageOperations.length, 1);
  assert.ok(storageOperations[0] instanceof PutObjectCommand);
  assert.equal(storageOperations[0].input.ContentType, "text/vtt");
});

test("invalid subtitle event or variation references fail before MinIO upload", async (t) => {
  const title = fixtureTitle();
  let storageCalls = 0;
  t.mock.method(Title, "findById", async () => title);
  t.mock.method(minioClient, "send", async () => {
    storageCalls += 1;
    return {};
  });

  const baseUrl = await startServer(t);
  const response = await fetch(
    `${baseUrl}/api/titles/${TITLE_ID}/subtitle-variants`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${makeToken()}` },
      body: createForm([
        {
          locale: "fr-FR",
          label: "Français",
          variationId: "ending-choice",
          optionId: "unknown",
          fileIndex: 0,
        },
      ]),
    },
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.message, /variation option/i);
  assert.equal(storageCalls, 0);
});

test("editing subtitle metadata preserves the approved asset unless a replacement is uploaded", async (t) => {
  const title = fixtureTitle();
  title.subtitleVariants = [
    {
      variantId: "variant-existing",
      locale: "en-US",
      label: "English",
      storageKey: "subtitles/approved-original.vtt",
      eventId: null,
      variationId: null,
      optionId: null,
    },
  ];
  let storageCalls = 0;
  t.mock.method(Title, "findById", async () => title);
  t.mock.method(minioClient, "send", async () => {
    storageCalls += 1;
    return {};
  });

  const form = new FormData();
  form.append(
    "variants",
    JSON.stringify([
      {
        variantId: "variant-existing",
        locale: "en-GB",
        label: "British English",
      },
    ]),
  );
  const baseUrl = await startServer(t);
  const response = await fetch(
    `${baseUrl}/api/titles/${TITLE_ID}/subtitle-variants`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${makeToken()}` },
      body: form,
    },
  );

  assert.equal(response.status, 200);
  assert.equal(title.subtitleVariants[0].locale, "en-GB");
  assert.equal(
    title.subtitleVariants[0].storageKey,
    "subtitles/approved-original.vtt",
  );
  assert.equal(storageCalls, 0);
});

test("subtitle endpoint rejects non-WebVTT uploads", async (t) => {
  const baseUrl = await startServer(t);
  const response = await fetch(
    `${baseUrl}/api/titles/${TITLE_ID}/subtitle-variants`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${makeToken()}` },
      body: createForm(
        [{ locale: "en", label: "English", fileIndex: 0 }],
        "captions.srt",
      ),
    },
  );

  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /WebVTT/);
});

test("published subtitle variants stream as WebVTT without exposing storage keys", async (t) => {
  const title = {
    subtitleVariants: [
      {
        variantId: "variant-en",
        locale: "en-US",
        label: "English",
        storageKey: "subtitles/private-key.vtt",
      },
    ],
  };
  let command;
  t.mock.method(Title, "findOne", () => ({
    select: async () => title,
  }));
  t.mock.method(minioClient, "send", async (input) => {
    command = input;
    return {
      Body: Readable.from(["WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHi\n"]),
    };
  });

  const baseUrl = await startServer(t);
  const response = await fetch(
    `${baseUrl}/api/titles/${TITLE_ID}/subtitle-variants/variant-en`,
  );
  const content = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/vtt/);
  assert.match(content, /WEBVTT/);
  assert.ok(command instanceof GetObjectCommand);
  assert.equal(command.input.Key, "subtitles/private-key.vtt");
});
