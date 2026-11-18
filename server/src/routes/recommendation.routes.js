import express from "express";
import { query } from "express-validator";

import authenticate from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.middleware.js";

import { getRecommendationsController } from "../controllers/recommendation.controller.js";

const router = express.Router();

// GET /api/recommendations
router.get(
  "/",
  authenticate,
  [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage("Limit must be between 1 and 20"),
  ],
  validate,
  getRecommendationsController,
);

export default router;
