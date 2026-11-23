import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import express from "express";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import WatchSpace from "../src/models/WatchSpace.js";
import Title from "../src/models/Title.js";
import watchSpaceRoutes from "../src/routes/watchSpace.routes.js";

const WATCH_SPACE_ID = "64f000000000000000000001";
const TITLE_ID = "64f000000000000000000002";
const HOST_ID = "64f000000000000000000003";
const PARTICIPANT_ID = "64f000000000000000000004";
const NONPARTICIPANT_ID = "64f000000000000000000005";
const JWT_SECRET = "test-access-secret";
const ENDPOINT = `/api/watch-spaces/${WATCH_SPACE_ID}/ai/ask`;

const configureAuth = (t) => {
  const previousSecret = process.env.ACCESS_TOKEN_SECRET;
  process.env.ACCESS_TOKEN_SECRET = JWT_SECRET;
  t.after(() => {
    if (previousSecret === undefined) {
      delete process.env.ACCESS_TOKEN_SECRET;
    } else {
      process.env.ACCESS_TOKEN_SECRET = previousSecret;
    }
  });

  t.mock.method(User, "findById", (userId) => ({
    select: async () => ({ _id: userId, role: "viewer" }),
  }));
};

const createWatchSpace = ({
  host = HOST_ID,
  participants = [{ user: PARTICIPANT_ID, role: "viewer" }],
  isPrivate = true,
} = {}) => ({
  _id: WATCH_SPACE_ID,
  title: TITLE_ID,
  host,
  participants,
  isPrivate,
  playback: { positionSeconds: 20 },
});

const createTitle = () => ({
  _id: TITLE_ID,
  timeline: [
    {
      eventId: "past-scene",
      startTime: 5,
      endTime: 10,
      eventType: "scene",
      description: "Mara enters the observatory.",
      transcript: "Mara says hello.",
      trivia: [],
      variationId: null,
      options: [],
    },
    {
      eventId: "future-scene",
      startTime: 30,
      endTime: 40,
      eventType: "scene",
      description: "Mara opens the future vault.",
      transcript: "",
      trivia: [],
      variationId: null,
      options: [],
    },
  ],
});

const startServer = async (t) => {
  const app = express();
  app.use(express.json());
  app.use("/api/watch-spaces", watchSpaceRoutes);
  const server = http.createServer(app);

  server.listen(0);
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));

  return `http://127.0.0.1:${server.address().port}`;
};

const sendRequest = (baseUrl, { token, body, path = ENDPOINT, method = "POST" }) =>
  new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const request = http.request(
      url,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (response) => {
        let responseBody = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          responseBody += chunk;
        });
        response.on("end", () => {
          resolve({
            status: response.statusCode,
            body: responseBody ? JSON.parse(responseBody) : null,
          });
        });
      },
    );

    request.on("error", reject);
    if (body !== undefined) {
      request.write(JSON.stringify(body));
    }
    request.end();
  });

const createToken = (userId) => jwt.sign({ sub: userId }, JWT_SECRET);

const configureCloudflare = (t) => {
  const keys = [
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_API_TOKEN",
    "CLOUDFLARE_AI_MODEL",
  ];
  const previous = Object.fromEntries(
    keys.map((key) => [key, process.env[key]]),
  );
  process.env.CLOUDFLARE_ACCOUNT_ID = "test-account";
  process.env.CLOUDFLARE_API_TOKEN = "test-token";
  process.env.CLOUDFLARE_AI_MODEL = "@cf/meta/llama-3.2-3b-instruct";

  t.after(() => {
    for (const key of keys) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  });

  return t.mock.method(globalThis, "fetch", async (_url, options) => {
    const requestBody = JSON.parse(options.body);
    const questionContext = JSON.parse(requestBody.messages[1].content);
    assert.deepEqual(
      questionContext.timelineEvents.map(({ eventId }) => eventId),
      ["past-scene"],
    );

    return {
      ok: true,
      json: async () => ({
        success: true,
        result: {
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: JSON.stringify({
                  selections: [
                    {
                      eventId: "past-scene",
                      excerpt: "Mara enters the observatory.",
                    },
                  ],
                }),
              },
            },
          ],
        },
      }),
    };
  });
};

const mockWatchSpaceReads = (t, watchSpace) =>
  t.mock.method(WatchSpace, "findById", async () => watchSpace);

const mockTitleLookup = (t) =>
  t.mock.method(Title, "findOne", async (filter) => {
    assert.deepEqual(filter, { _id: TITLE_ID, isPublished: true });
    return createTitle();
  });

test("allows an authenticated WatchSpace host and returns the Q&A contract", async (t) => {
  configureAuth(t);
  const watchSpaceReads = mockWatchSpaceReads(t, createWatchSpace());
  mockTitleLookup(t);
  const fetchMock = configureCloudflare(t);
  const baseUrl = await startServer(t);

  const response = await sendRequest(baseUrl, {
    token: createToken(HOST_ID),
    body: {
      question: "Who enters the observatory?",
      userId: NONPARTICIPANT_ID,
      currentTs: 9999,
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(response.body).sort(), [
    "answer",
    "answerMode",
    "followUpQuestions",
    "generatedAt",
    "sourceEvents",
  ]);
  assert.equal(response.body.answer, "Mara enters the observatory.");
  assert.deepEqual(response.body.sourceEvents, ["past-scene"]);
  assert.ok(Number.isFinite(Date.parse(response.body.generatedAt)));
  assert.equal(watchSpaceReads.mock.callCount(), 2);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("allows an authenticated participant", async (t) => {
  configureAuth(t);
  mockWatchSpaceReads(t, createWatchSpace());
  mockTitleLookup(t);
  const fetchMock = configureCloudflare(t);
  const baseUrl = await startServer(t);

  const response = await sendRequest(baseUrl, {
    token: createToken(PARTICIPANT_ID),
    body: { question: "Who enters the observatory?" },
  });

  assert.equal(response.status, 200);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("denies authenticated nonparticipants from a public WatchSpace before AI retrieval", async (t) => {
  configureAuth(t);
  const watchSpaceReads = mockWatchSpaceReads(
    t,
    createWatchSpace({ isPrivate: false }),
  );
  const titleLookup = t.mock.method(Title, "findOne", async () =>
    createTitle(),
  );
  const fetchMock = configureCloudflare(t);
  const baseUrl = await startServer(t);

  const response = await sendRequest(baseUrl, {
    token: createToken(NONPARTICIPANT_ID),
    body: { question: "What happens next?", userId: HOST_ID },
  });

  assert.equal(response.status, 403);
  assert.equal(watchSpaceReads.mock.callCount(), 1);
  assert.equal(titleLookup.mock.callCount(), 0);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("rejects unauthenticated requests before accessing the WatchSpace", async (t) => {
  const watchSpaceReads = mockWatchSpaceReads(t, createWatchSpace());
  const baseUrl = await startServer(t);

  const response = await sendRequest(baseUrl, {
    body: { question: "Who enters the observatory?" },
  });

  assert.equal(response.status, 401);
  assert.equal(watchSpaceReads.mock.callCount(), 0);
});

test("returns 404 for a nonexistent WatchSpace without invoking AI", async (t) => {
  configureAuth(t);
  const watchSpaceReads = mockWatchSpaceReads(t, null);
  const fetchMock = configureCloudflare(t);
  const baseUrl = await startServer(t);

  const response = await sendRequest(baseUrl, {
    token: createToken(HOST_ID),
    body: { question: "Who enters the observatory?" },
  });

  assert.equal(response.status, 404);
  assert.equal(watchSpaceReads.mock.callCount(), 1);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("rejects an invalid question with 400 before accessing the WatchSpace", async (t) => {
  configureAuth(t);
  const watchSpaceReads = mockWatchSpaceReads(t, createWatchSpace());
  const baseUrl = await startServer(t);

  const response = await sendRequest(baseUrl, {
    token: createToken(HOST_ID),
    body: { question: "   " },
  });

  assert.equal(response.status, 400);
  assert.equal(watchSpaceReads.mock.callCount(), 0);
});


test("returns playback-aware AI suggestions to an authenticated WatchSpace participant", async (t) => {
  configureAuth(t);
  mockWatchSpaceReads(t, createWatchSpace());
  mockTitleLookup(t);
  const baseUrl = await startServer(t);

  const response = await sendRequest(baseUrl, {
    token: createToken(PARTICIPANT_ID),
    method: "GET",
    path: `/api/watch-spaces/${WATCH_SPACE_ID}/ai/suggestions`,
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.currentTime, 20);
  assert.deepEqual(
    response.body.suggestions.map(({ type, eventId }) => ({ type, eventId })),
    [{ type: "scene", eventId: "past-scene" }],
  );
  assert.match(response.body.suggestions[0].question, /Mara enters the observatory/);
});

test("denies nonparticipants from viewing AI suggestions", async (t) => {
  configureAuth(t);
  const watchSpaceReads = mockWatchSpaceReads(
    t,
    createWatchSpace({ isPrivate: false }),
  );
  const titleLookup = t.mock.method(Title, "findOne", async () => createTitle());
  const baseUrl = await startServer(t);

  const response = await sendRequest(baseUrl, {
    token: createToken(NONPARTICIPANT_ID),
    method: "GET",
    path: `/api/watch-spaces/${WATCH_SPACE_ID}/ai/suggestions`,
  });

  assert.equal(response.status, 403);
  assert.equal(watchSpaceReads.mock.callCount(), 1);
  assert.equal(titleLookup.mock.callCount(), 0);
});
