import express from "express";

import authenticate from "../middleware/auth.middleware.js";
import authorizeRoles from "../middleware/role.middleware.js";
import {
  getAdminDashboardOverviewController,
} from "../controllers/adminDashboard.controller.js";

const router = express.Router();

router.get(
  "/dashboard/overview",
  authenticate,
  authorizeRoles("admin"),
  getAdminDashboardOverviewController,
);

export default router;
