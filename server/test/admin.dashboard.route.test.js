import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import express from "express";
import jwt from "jsonwebtoken";

import User from "../src/models/User.js";
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
