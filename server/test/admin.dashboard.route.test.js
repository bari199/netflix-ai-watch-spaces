import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import express from "express";
import jwt from "jsonwebtoken";

import User from "../src/models/User.js";
import Title from "../src/models/Title.js";
import WatchSpace from "../src/models/WatchSpace.js";
import ChatMessage from "../src/models/ChatMessage.js";
import adminRoutes from "../src/routes/admin.routes.js";

const JWT_SECRET = "admin-dashboard-test-secret";
const ADMIN_ID = "64f000000000000000000101";
const VIEWER_ID = "64f000000000000000000102";
const ENDPOINT = "/api/admin/dashboard/overview";

const configureAuth = (t, role) => {
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
    select: async () => ({
      _id: userId,
      role,
    }),
  }));
};

const createToken = (userId) =>
  jwt.sign({ sub: userId }, JWT_SECRET);

const startServer = async (t) => {
  const app = express();
  app.use("/api/admin", adminRoutes);

  const server = http.createServer(app);
  server.listen(0);
  await once(server, "listening");

  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
      }),
  );

  return `http://127.0.0.1:${server.address().port}`;
};

const getOverview = (baseUrl, token) =>
  new Promise((resolve, reject) => {
    const request = http.request(
      new URL(ENDPOINT, baseUrl),
      {
        method: "GET",
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {},
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
    request.end();
  });

test("rejects unauthenticated admin dashboard requests", async (t) => {
  const baseUrl = await startServer(t);
  const response = await getOverview(baseUrl);

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

test("rejects authenticated non-admin users from the admin dashboard", async (t) => {
  configureAuth(t, "viewer");

  const baseUrl = await startServer(t);
  const response = await getOverview(baseUrl, createToken(VIEWER_ID));

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
});

const createQuery = (result) => ({
  select() {
    return this;
  },
  populate() {
    return this;
  },
  sort() {
    return this;
  },
  limit() {
    return this;
  },
  lean: async () => result,
});

const configureOverviewData = (t) => {
  t.mock.method(User, "aggregate", async (pipeline) => {
    if (pipeline[0]?.$group?._id === "$role") {
      return [
        { _id: "admin", count: 1 },
        { _id: "host", count: 2 },
        { _id: "viewer", count: 7 },
      ];
    }

    return [{ _id: "2026-11", count: 3 }];
  });

  t.mock.method(Title, "aggregate", async () => [
    { _id: true, count: 5 },
    { _id: false, count: 2 },
  ]);

  t.mock.method(WatchSpace, "aggregate", async (pipeline) => {
    if (pipeline[0]?.$unwind === "$participants") {
      return [
        {
          totalParticipantRecords: 12,
          uniqueParticipants: 8,
        },
      ];
    }

    if (pipeline[0]?.$group?._id === "$status") {
      return [
        { _id: "active", count: 2 },
        { _id: "ended", count: 4 },
        { _id: "scheduled", count: 1 },
        { _id: "waiting", count: 3 },
      ];
    }

    if (pipeline[0]?.$group?._id === null) {
      return [{ totalAIQuestions: 19 }];
    }

    return [{ _id: "2026-11", count: 2 }];
  });

  t.mock.method(ChatMessage, "countDocuments", async () => 23);
  t.mock.method(ChatMessage, "aggregate", async () => [
    { _id: "2026-11", count: 6 },
  ]);

  t.mock.method(User, "find", () => createQuery([]));
  t.mock.method(WatchSpace, "find", () => createQuery([]));
  t.mock.method(ChatMessage, "find", () => createQuery([]));
};

test("returns aggregated overview data to an authenticated admin", async (t) => {
  configureAuth(t, "admin");
  configureOverviewData(t);

  const baseUrl = await startServer(t);
  const response = await getOverview(baseUrl, createToken(ADMIN_ID));

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);

  const { overview } = response.body;

  assert.deepEqual(overview.users, {
    total: 10,
    admin: 1,
    host: 2,
    viewer: 7,
  });

  assert.deepEqual(overview.watchSpaces, {
    total: 10,
    active: 2,
    ended: 4,
    scheduled: 1,
    waiting: 3,
  });

  assert.deepEqual(overview.titles, {
    total: 7,
    published: 5,
    drafts: 2,
  });

  assert.equal(overview.engagement.totalMessages, 23);
  assert.equal(overview.engagement.totalParticipantRecords, 12);
  assert.equal(overview.engagement.uniqueParticipants, 8);
  assert.equal(overview.ai.totalQuestions, 19);

  assert.equal(overview.charts.monthlyPlatformGrowth.users.length, 10);
  assert.equal(overview.charts.monthlyPlatformGrowth.watchSpaces.length, 10);
  assert.equal(overview.charts.monthlyPlatformGrowth.messages.length, 10);

  assert.deepEqual(overview.recentActivity, []);
  assert.equal(JSON.stringify(response.body).includes("password"), false);
  assert.equal(JSON.stringify(response.body).includes("inviteCode"), false);
});
