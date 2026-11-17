import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { Readable } from "node:stream";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import User from "../src/models/User.js";
import Title from "../src/models/Title.js";

const TEST_BUCKET = "title-multipart-integration-test";
const ACCESS_SECRET = "multipart-test-access-secret";
const ADMIN_ID = "64f000000000000000000101";
const VIEWER_ID = "64f000000000000000000102";
const TITLE_ID = "64f000000000000000000103";

const previousBucket = process.env.MINIO_BUCKET;
process.env.MINIO_BUCKET = TEST_BUCKET;

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

const createTimeline = () => [
  {
    eventId: "event-scene",
    eventType: "scene",
    startTime: 0,
    endTime: 10,
    text: "A scene begins.",
    customMetadata: { source: "timeline-editor" },
  },
  {
    eventId: "event-character",
    eventType: "characterAppearance",
    startTime: 10,
    endTime: 20,
    text: "Mara appears.",
    characterId: "character-mara",
    characterName: "Mara",
  },
  {
    eventId: "event-trivia",
    eventType: "trivia",
    startTime: 20,
    endTime: 25,
    text: "The station opened in 1980.",
  },
  {
    eventId: "event-glossary",
    eventType: "glossary",
    startTime: 25,
    endTime: 30,
    text: "Observatory: a place for observing celestial objects.",
  },
  {
    eventId: "event-variation",
    eventType: "variationPoint",
    startTime: 30,
    endTime: 40,
    text: "The group chooses a route.",
    variationId: "route-choice",
    options: [
      { id: "route-north", label: "Go north" },
      { id: "route-south", label: "Go south" },
    ],
  },
  {
    eventId: "event-legacy",
    eventType: "scene",
    startTime: 40,
    endTime: 50,
    description: "Legacy description-only content.",
    retainedMetadata: "keep me",
  },
];

const makeToken = (userId) => jwt.sign({ sub: userId }, ACCESS_SECRET);

const configureAuth = (t) => {
  const previousSecret = process.env.ACCESS_TOKEN_SECRET;
  process.env.ACCESS_TOKEN_SECRET = ACCESS_SECRET;

  t.after(() => {
    if (previousSecret === undefined) {
      delete process.env.ACCESS_TOKEN_SECRET;
    } else {
      process.env.ACCESS_TOKEN_SECRET = previousSecret;
    }
  });

  const roles = new Map([
    [ADMIN_ID, "admin"],
    [VIEWER_ID, "viewer"],
  ]);

  t.mock.method(User, "findById", (userId) => ({
    select: async () => ({
      _id: userId,
      role: roles.get(String(userId)),
    }),
  }));
};

const startServer = async (t) => {
  const app = express();
  app.use("/api/titles", titleRoutes);
  const server = http.createServer(app);

  server.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  return `http://127.0.0.1:${server.address().port}`;
};

const sendRequest = async (baseUrl, { method, path, token, body }) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  });
  const responseText = await response.text();
  let responseBody = null;

  try {
    responseBody = responseText ? JSON.parse(responseText) : null;
  } catch {
    // Multer errors use Express's default non-JSON error response.
  }

  return {
    status: response.status,
    body: responseBody,
  };
};

const appendFile = (form, field, filename, contentType, content) => {
  form.append(field, new Blob([content], { type: contentType }), filename);
};

const appendCreateFields = (form, timeline) => {
  form.append("name", "Multipart timeline test title");
  form.append("description", "Created through the title route test.");
  form.append("genre", JSON.stringify(["Drama", "Sci-Fi"]));
  form.append("duration", "60");
  form.append("isPublished", "true");
  form.append("timeline", JSON.stringify(timeline));
};

const mockStorage = (t, operations = []) =>
  t.mock.method(minioClient, "send", async (command) => {
    operations.push(command);
    return {};
  });

test("POST /titles parses all timeline types and accepts video and thumbnail multipart fields", async (t) => {
  configureAuth(t);
  const operations = [];
  mockStorage(t, operations);

  let createdTitle;
  t.mock.method(Title, "create", async (data) => {
    createdTitle = data;
    return { ...data, _id: TITLE_ID };
  });

  const baseUrl = await startServer(t);
  const timeline = createTimeline();
  const form = new FormData();
  appendCreateFields(form, timeline);
  appendFile(form, "video", "fixture.mp4", "video/mp4", "test video bytes");
  appendFile(
    form,
    "thumbnail",
    "fixture.png",
    "image/png",
    "test thumbnail bytes",
  );

  const response = await sendRequest(baseUrl, {
    method: "POST",
    path: "/api/titles",
    token: makeToken(ADMIN_ID),
    body: form,
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.deepEqual(createdTitle.timeline, timeline);
  assert.deepEqual(createdTitle.genre, ["Drama", "Sci-Fi"]);
  assert.equal(createdTitle.createdBy, ADMIN_ID);
  assert.equal(response.body.title._id, TITLE_ID);

  assert.equal(operations.length, 2);
  assert.ok(operations.every((command) => command instanceof PutObjectCommand));
  const videoUpload = operations.find(
    ({ input }) => input.ContentType === "video/mp4",
  );
  const thumbnailUpload = operations.find(
    ({ input }) => input.ContentType === "image/png",
  );
  assert.ok(videoUpload);
  assert.ok(thumbnailUpload);
  assert.equal(videoUpload.input.Bucket, TEST_BUCKET);
  assert.equal(thumbnailUpload.input.Bucket, TEST_BUCKET);
  assert.match(videoUpload.input.Key, /^videos\/.+\.mp4$/);
  assert.match(thumbnailUpload.input.Key, /^thumbnails\/.+\.png$/);
  assert.equal(
    Buffer.from(videoUpload.input.Body).toString(),
    "test video bytes",
  );
  assert.equal(
    Buffer.from(thumbnailUpload.input.Body).toString(),
    "test thumbnail bytes",
  );
});

test("PATCH /titles/:id preserves existing title fields and timeline event data through the mocked model update", async (t) => {
  configureAuth(t);
  const operations = [];
  mockStorage(t, operations);

  const existingTitle = {
    _id: TITLE_ID,
    name: "Existing title name",
    description: "Existing title description",
    duration: 60,
    videoKey: "videos/previous.mp4",
    thumbnailKey: "thumbnails/previous.png",
    timeline: [
      {
        eventId: "event-legacy",
        eventType: "scene",
        startTime: 0,
        endTime: 5,
        description: "Original legacy description.",
      },
    ],
  };
  let updateDocument;
  let updateOptions;

  t.mock.method(Title, "findById", async (titleId) => {
    assert.equal(String(titleId), TITLE_ID);
    return existingTitle;
  });
  t.mock.method(
    Title,
    "findByIdAndUpdate",
    async (_titleId, update, options) => {
      updateDocument = update;
      updateOptions = options;
      return new Title({ ...existingTitle, ...update.$set });
    },
  );
  t.mock.method(Title, "exists", async () => null);

  const baseUrl = await startServer(t);
  const timeline = createTimeline();
  timeline[0].text = "Updated scene text.";
  timeline[0].customMetadata = {
    source: "editor",
    retained: true,
  };
  timeline[5].description = "Edited legacy description.";
  const form = new FormData();
  form.append("timeline", JSON.stringify(timeline));
  appendFile(
    form,
    "thumbnail",
    "replacement.jpg",
    "image/jpeg",
    "replacement thumbnail bytes",
  );

  const response = await sendRequest(baseUrl, {
    method: "PATCH",
    path: `/api/titles/${TITLE_ID}`,
    token: makeToken(ADMIN_ID),
    body: form,
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.deepEqual(updateDocument.$set.timeline, timeline);
  assert.equal(updateDocument.$set.name, undefined);
  assert.equal(updateDocument.$set.description, undefined);
  assert.equal(response.body.title.name, "Existing title name");
  assert.equal(response.body.title.description, "Existing title description");
  assert.equal(response.body.title.videoKey, "videos/previous.mp4");
  assert.equal(response.body.title.timeline[0].eventId, "event-scene");
  assert.deepEqual(response.body.title.timeline[0].customMetadata, {
    source: "editor",
    retained: true,
  });
  assert.equal(response.body.title.timeline[5].text, undefined);
  assert.equal(
    response.body.title.timeline[5].description,
    "Edited legacy description.",
  );
  assert.equal(
    response.body.title.timeline[5].retainedMetadata,
    "keep me",
  );
  assert.equal(updateOptions.runValidators, true);
  assert.equal(operations.length, 2);
  assert.ok(operations[0] instanceof PutObjectCommand);
  assert.ok(operations[1] instanceof DeleteObjectCommand);
  assert.equal(operations[0].input.ContentType, "image/jpeg");
  assert.equal(operations[0].input.Bucket, TEST_BUCKET);
  assert.equal(operations[1].input.Key, "thumbnails/previous.png");
});

test("PATCH metadata without new media preserves existing video and thumbnail keys", async (t) => {
  configureAuth(t);
  const operations = [];
  mockStorage(t, operations);

  const existingTitle = {
    _id: TITLE_ID,
    name: "Existing title",
    description: "Existing description",
    duration: 60,
    videoKey: "videos/keep.mp4",
    thumbnailKey: "thumbnails/keep.png",
    timeline: [],
  };
  let updateDocument;
  t.mock.method(Title, "findById", async () => existingTitle);
  t.mock.method(Title, "exists", async () => null);
  t.mock.method(Title, "findByIdAndUpdate", async (_id, update) => {
    updateDocument = update;
    return { ...existingTitle, ...update.$set };
  });

  const baseUrl = await startServer(t);
  const form = new FormData();
  form.append("name", "Updated metadata");
  form.append("description", "Updated description only.");
  form.append(
    "timeline",
    JSON.stringify([
      {
        eventId: "timeline-only",
        eventType: "scene",
        startTime: 0,
        endTime: 10,
        text: "Updated timeline metadata.",
      },
    ]),
  );
  const response = await sendRequest(baseUrl, {
    method: "PATCH",
    path: `/api/titles/${TITLE_ID}`,
    token: makeToken(ADMIN_ID),
    body: form,
  });

  assert.equal(response.status, 200);
  assert.equal(updateDocument.$set.videoKey, undefined);
  assert.equal(updateDocument.$set.thumbnailKey, undefined);
  assert.equal(updateDocument.$set.description, "Updated description only.");
  assert.equal(updateDocument.$set.timeline[0].eventId, "timeline-only");
  assert.equal(response.body.title.videoKey, "videos/keep.mp4");
  assert.equal(response.body.title.thumbnailKey, "thumbnails/keep.png");
  assert.deepEqual(operations, []);
});

test("PATCH uploads and persists a replacement video before deleting the previous asset", async (t) => {
  configureAuth(t);
  const operations = [];
  mockStorage(t, operations);

  const existingTitle = {
    _id: TITLE_ID,
    name: "Existing title",
    duration: 60,
    videoKey: "videos/previous.mp4",
    thumbnailKey: "thumbnails/previous.png",
    timeline: [],
  };
  let updateDocument;
  t.mock.method(Title, "findById", async () => existingTitle);
  t.mock.method(Title, "exists", async () => null);
  t.mock.method(Title, "findByIdAndUpdate", async (_id, update) => {
    updateDocument = update;
    operations.push({ databaseUpdate: true });
    return { ...existingTitle, ...update.$set };
  });

  const baseUrl = await startServer(t);
  const form = new FormData();
  form.append("name", "Replacement video title");
  appendFile(form, "video", "replacement.webm", "video/webm", "new video");
  const response = await sendRequest(baseUrl, {
    method: "PATCH",
    path: `/api/titles/${TITLE_ID}`,
    token: makeToken(ADMIN_ID),
    body: form,
  });

  assert.equal(response.status, 200);
  assert.match(updateDocument.$set.videoKey, /^videos\/.+\.webm$/);
  assert.equal(response.body.title.videoKey, updateDocument.$set.videoKey);
  assert.ok(operations[0] instanceof PutObjectCommand);
  assert.equal(operations[0].input.ContentType, "video/webm");
  assert.equal(operations[1].databaseUpdate, true);
  assert.ok(operations[2] instanceof DeleteObjectCommand);
  assert.equal(operations[2].input.Key, "videos/previous.mp4");
});

test("PATCH thumbnail replacement does not replace or delete the current video", async (t) => {
  configureAuth(t);
  const operations = [];
  mockStorage(t, operations);

  const existingTitle = {
    _id: TITLE_ID,
    name: "Existing title",
    duration: 60,
    videoKey: "videos/keep-playing.mp4",
    thumbnailKey: "thumbnails/previous.png",
    timeline: [],
  };
  let updateDocument;
  t.mock.method(Title, "findById", async () => existingTitle);
  t.mock.method(Title, "exists", async () => null);
  t.mock.method(Title, "findByIdAndUpdate", async (_id, update) => {
    updateDocument = update;
    return { ...existingTitle, ...update.$set };
  });

  const baseUrl = await startServer(t);
  const form = new FormData();
  form.append("description", "Thumbnail replaced only.");
  appendFile(form, "thumbnail", "replacement.png", "image/png", "new image");
  const response = await sendRequest(baseUrl, {
    method: "PATCH",
    path: `/api/titles/${TITLE_ID}`,
    token: makeToken(ADMIN_ID),
    body: form,
  });

  assert.equal(response.status, 200);
  assert.equal(updateDocument.$set.videoKey, undefined);
  assert.match(updateDocument.$set.thumbnailKey, /^thumbnails\/.+\.png$/);
  assert.equal(response.body.title.videoKey, "videos/keep-playing.mp4");
  assert.equal(response.body.title.thumbnailKey, updateDocument.$set.thumbnailKey);
  assert.ok(operations[0] instanceof PutObjectCommand);
  assert.ok(operations[1] instanceof DeleteObjectCommand);
  assert.equal(operations[1].input.Key, "thumbnails/previous.png");
  assert.ok(
    operations.every(
      (command) =>
        !(command instanceof DeleteObjectCommand) ||
        command.input.Key !== "videos/keep-playing.mp4",
    ),
  );
});

test("PATCH video upload failure leaves the existing video reference and title update untouched", async (t) => {
  configureAuth(t);
  const operations = [];
  t.mock.method(minioClient, "send", async (command) => {
    operations.push(command);
    if (command instanceof PutObjectCommand) {
      throw new Error("MinIO unavailable");
    }
    return {};
  });

  const existingTitle = {
    _id: TITLE_ID,
    name: "Existing title",
    duration: 60,
    videoKey: "videos/available.mp4",
    thumbnailKey: "thumbnails/available.png",
    timeline: [],
  };
  const updateMock = t.mock.method(Title, "findByIdAndUpdate", async () => {
    throw new Error("Title update must not run when upload fails");
  });
  t.mock.method(Title, "findById", async () => existingTitle);
  t.mock.method(Title, "exists", async () => null);

  const baseUrl = await startServer(t);
  const form = new FormData();
  form.append("name", "Should not be persisted");
  appendFile(form, "video", "replacement.mp4", "video/mp4", "new video");
  const response = await sendRequest(baseUrl, {
    method: "PATCH",
    path: `/api/titles/${TITLE_ID}`,
    token: makeToken(ADMIN_ID),
    body: form,
  });

  assert.equal(response.status, 500);
  assert.deepEqual(response.body, {
    success: false,
    message: "Internal server error",
  });
  assert.equal(updateMock.mock.callCount(), 0);
  assert.equal(existingTitle.videoKey, "videos/available.mp4");
  assert.ok(operations.some((command) => command instanceof PutObjectCommand));
  assert.ok(operations.some((command) => command instanceof DeleteObjectCommand));
  assert.ok(
    operations.every(
      (command) =>
        !(command instanceof DeleteObjectCommand) ||
        command.input.Key !== "videos/available.mp4",
    ),
  );
});

test("PATCH database update failure cleans the new video and keeps the previous key", async (t) => {
  configureAuth(t);
  const operations = [];
  mockStorage(t, operations);

  const existingTitle = {
    _id: TITLE_ID,
    name: "Existing title",
    duration: 60,
    videoKey: "videos/previous.mp4",
    thumbnailKey: "thumbnails/previous.png",
    timeline: [],
  };
  t.mock.method(Title, "findById", async () => existingTitle);
  t.mock.method(Title, "exists", async () => null);
  t.mock.method(Title, "findByIdAndUpdate", async () => {
    throw new Error("Database unavailable");
  });

  const baseUrl = await startServer(t);
  const form = new FormData();
  form.append("name", "Replacement not persisted");
  appendFile(form, "video", "replacement.mp4", "video/mp4", "new video");
  const response = await sendRequest(baseUrl, {
    method: "PATCH",
    path: `/api/titles/${TITLE_ID}`,
    token: makeToken(ADMIN_ID),
    body: form,
  });

  assert.equal(response.status, 500);
  assert.equal(existingTitle.videoKey, "videos/previous.mp4");
  assert.ok(operations[0] instanceof PutObjectCommand);
  assert.ok(
    operations.some(
      (command) =>
        command instanceof DeleteObjectCommand &&
        command.input.Key === operations[0].input.Key,
    ),
  );
  assert.ok(
    operations.every(
      (command) =>
        !(command instanceof DeleteObjectCommand) ||
        command.input.Key !== existingTitle.videoKey,
    ),
  );
});

test("PATCH keeps an old asset when another Title still references the same key", async (t) => {
  configureAuth(t);
  const operations = [];
  mockStorage(t, operations);

  const existingTitle = {
    _id: TITLE_ID,
    name: "Existing title",
    duration: 60,
    videoKey: "videos/shared.mp4",
    thumbnailKey: "thumbnails/shared.png",
    timeline: [],
  };
  t.mock.method(Title, "findById", async () => existingTitle);
  t.mock.method(Title, "findByIdAndUpdate", async (_id, update) => ({
    ...existingTitle,
    ...update.$set,
  }));
  t.mock.method(Title, "exists", async (filter) =>
    filter.videoKey === "videos/shared.mp4" ? { _id: "other-title" } : null,
  );

  const baseUrl = await startServer(t);
  const form = new FormData();
  appendFile(form, "video", "replacement.mp4", "video/mp4", "new video");
  const response = await sendRequest(baseUrl, {
    method: "PATCH",
    path: `/api/titles/${TITLE_ID}`,
    token: makeToken(ADMIN_ID),
    body: form,
  });

  assert.equal(response.status, 200);
  assert.ok(
    operations.every(
      (command) =>
        !(command instanceof DeleteObjectCommand) ||
        command.input.Key !== "videos/shared.mp4",
    ),
  );
});

test("PATCH retains a newly uploaded key when a failed DB response follows a committed update", async (t) => {
  configureAuth(t);
  const operations = [];
  mockStorage(t, operations);

  const title = {
    _id: TITLE_ID,
    name: "Existing title",
    duration: 60,
    videoKey: "videos/previous.mp4",
    thumbnailKey: "thumbnails/previous.png",
    timeline: [],
  };
  let findByIdCount = 0;
  t.mock.method(Title, "findById", async () => {
    findByIdCount += 1;
    return findByIdCount === 1
      ? { ...title, videoKey: "videos/previous.mp4" }
      : title;
  });
  t.mock.method(Title, "exists", async () => null);
  t.mock.method(Title, "findByIdAndUpdate", async (_id, update) => {
    Object.assign(title, update.$set);
    throw new Error("Connection lost after database write");
  });

  const baseUrl = await startServer(t);
  const form = new FormData();
  appendFile(form, "video", "replacement.mp4", "video/mp4", "new video");
  const response = await sendRequest(baseUrl, {
    method: "PATCH",
    path: `/api/titles/${TITLE_ID}`,
    token: makeToken(ADMIN_ID),
    body: form,
  });
  const uploadedKey = operations.find(
    (command) => command instanceof PutObjectCommand,
  ).input.Key;

  assert.equal(response.status, 500);
  assert.equal(title.videoKey, uploadedKey);
  assert.ok(
    operations.every(
      (command) =>
        !(command instanceof DeleteObjectCommand) ||
        command.input.Key !== uploadedKey,
    ),
  );
});

test("video streaming resolves the current Title videoKey after a replacement", async (t) => {
  const currentVideoKey = "videos/current-version.webm";
  let titleQuery;
  const commands = [];
  t.mock.method(Title, "findOne", (query) => {
    titleQuery = query;
    return {
      select: async () => ({ videoKey: currentVideoKey }),
    };
  });
  t.mock.method(minioClient, "send", async (command) => {
    commands.push(command);
    if (command instanceof HeadObjectCommand) {
      return {
        ContentLength: 7,
        ContentType: "video/webm",
      };
    }

    return {
      Body: Readable.from(["newdata"]),
      ContentLength: 7,
      ContentType: "video/webm",
    };
  });

  const baseUrl = await startServer(t);
  const response = await fetch(`${baseUrl}/api/titles/${TITLE_ID}/video`);

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "newdata");
  assert.deepEqual(titleQuery, { _id: TITLE_ID, isPublished: true });
  assert.equal(commands.length, 2);
  assert.ok(commands[0] instanceof HeadObjectCommand);
  assert.ok(commands[1] instanceof GetObjectCommand);
  assert.equal(commands[0].input.Key, currentVideoKey);
  assert.equal(commands[1].input.Key, currentVideoKey);
});

test("Edit Title metadata GET returns the current video and thumbnail keys on refresh", async (t) => {
  const currentTitle = {
    _id: TITLE_ID,
    name: "Published test title",
    videoKey: "videos/current.mp4",
    thumbnailKey: "thumbnails/current.png",
  };
  t.mock.method(Title, "findOne", () => ({
    select: async () => currentTitle,
  }));
  const baseUrl = await startServer(t);
  const response = await sendRequest(baseUrl, {
    method: "GET",
    path: `/api/titles/${TITLE_ID}`,
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.title.videoKey, "videos/current.mp4");
  assert.equal(response.body.title.thumbnailKey, "thumbnails/current.png");
});

test("DELETE title preserves shared MinIO assets and removes unshared assets", async (t) => {
  configureAuth(t);
  const operations = [];
  mockStorage(t, operations);

  const title = {
    _id: TITLE_ID,
    videoKey: "videos/shared.mp4",
    thumbnailKey: "thumbnails/unique.png",
    subtitleVariants: [],
  };
  t.mock.method(Title, "findById", async () => title);
  t.mock.method(Title, "findByIdAndDelete", async () => title);
  t.mock.method(Title, "exists", async (filter) =>
    filter.videoKey === "videos/shared.mp4" ? { _id: "other-title" } : null,
  );

  const baseUrl = await startServer(t);
  const response = await sendRequest(baseUrl, {
    method: "DELETE",
    path: `/api/titles/${TITLE_ID}`,
    token: makeToken(ADMIN_ID),
  });

  assert.equal(response.status, 200);
  assert.equal(operations.length, 1);
  assert.ok(operations[0] instanceof DeleteObjectCommand);
  assert.equal(operations[0].input.Key, "thumbnails/unique.png");
});

test("POST and PATCH reject authenticated non-admins before invoking storage or model writes", async (t) => {
  configureAuth(t);
  const operations = [];
  mockStorage(t, operations);
  const createMock = t.mock.method(Title, "create", async () => {
    throw new Error("Title.create should not be called");
  });
  const updateMock = t.mock.method(Title, "findByIdAndUpdate", async () => {
    throw new Error("Title.findByIdAndUpdate should not be called");
  });
  const baseUrl = await startServer(t);

  const anonymousCreateForm = new FormData();
  appendCreateFields(anonymousCreateForm, createTimeline());
  appendFile(
    anonymousCreateForm,
    "video",
    "fixture.mp4",
    "video/mp4",
    "test video bytes",
  );
  const anonymousCreateResponse = await sendRequest(baseUrl, {
    method: "POST",
    path: "/api/titles",
    body: anonymousCreateForm,
  });

  const anonymousUpdateForm = new FormData();
  anonymousUpdateForm.append("timeline", JSON.stringify(createTimeline()));
  const anonymousUpdateResponse = await sendRequest(baseUrl, {
    method: "PATCH",
    path: `/api/titles/${TITLE_ID}`,
    body: anonymousUpdateForm,
  });

  const createForm = new FormData();
  appendCreateFields(createForm, createTimeline());
  appendFile(
    createForm,
    "video",
    "fixture.mp4",
    "video/mp4",
    "test video bytes",
  );
  const createResponse = await sendRequest(baseUrl, {
    method: "POST",
    path: "/api/titles",
    token: makeToken(VIEWER_ID),
    body: createForm,
  });

  const updateForm = new FormData();
  updateForm.append("timeline", JSON.stringify(createTimeline()));
  const updateResponse = await sendRequest(baseUrl, {
    method: "PATCH",
    path: `/api/titles/${TITLE_ID}`,
    token: makeToken(VIEWER_ID),
    body: updateForm,
  });

  assert.equal(anonymousCreateResponse.status, 401);
  assert.equal(anonymousUpdateResponse.status, 401);
  assert.equal(createResponse.status, 403);
  assert.equal(updateResponse.status, 403);
  assert.equal(operations.length, 0);
  assert.equal(createMock.mock.callCount(), 0);
  assert.equal(updateMock.mock.callCount(), 0);
});

test("rejects invalid timeline metadata before any MinIO or model operation", async (t) => {
  configureAuth(t);
  const operations = [];
  mockStorage(t, operations);
  const createMock = t.mock.method(Title, "create", async () => {
    throw new Error("Title.create should not be called");
  });
  const baseUrl = await startServer(t);
  const invalidTimeline = createTimeline();
  invalidTimeline[0].endTime = 61;
  const form = new FormData();
  appendCreateFields(form, invalidTimeline);
  appendFile(form, "video", "fixture.mp4", "video/mp4", "test video bytes");

  const response = await sendRequest(baseUrl, {
    method: "POST",
    path: "/api/titles",
    token: makeToken(ADMIN_ID),
    body: form,
  });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /cannot end after the Title duration/);
  assert.equal(operations.length, 0);
  assert.equal(createMock.mock.callCount(), 0);
});

test("rejects unsupported multipart media types before storage", async (t) => {
  configureAuth(t);
  const operations = [];
  mockStorage(t, operations);
  const baseUrl = await startServer(t);
  const form = new FormData();
  appendCreateFields(form, createTimeline());
  appendFile(form, "video", "fixture.txt", "text/plain", "not a video");

  const response = await sendRequest(baseUrl, {
    method: "POST",
    path: "/api/titles",
    token: makeToken(ADMIN_ID),
    body: form,
  });

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    success: false,
    message:
      "Invalid file type. Video: MP4, WEBM, MOV. Thumbnail: JPEG, PNG, WEBP.",
  });
  assert.equal(operations.length, 0);
});
