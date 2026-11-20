import express from "express";
import { param } from "express-validator";

import authenticate from "../middleware/auth.middleware.js";
import { authorizeWatchSpaceHost } from "../middleware/role.middleware.js";
import validate from "../middleware/validate.middleware.js";

import { getWatchSpaceAnalyticsController } from "../controllers/analytics.controller.js";

const router = express.Router();

// Host: Get WatchSpace analytics
router.get(
  "/:watchSpaceId",
  authenticate,
  authorizeWatchSpaceHost,
  param("watchSpaceId").isMongoId().withMessage("Invalid WatchSpace ID"),
  validate,
  getWatchSpaceAnalyticsController,
);

export default router;
