import { Router } from "express";
import { getRecentlyWatchedController } from "../controllers/interaction.controller.js";
import  authenticate  from "../middleware/auth.middleware.js";

const router = Router();

router.get("/recently-watched", authenticate, getRecentlyWatchedController);

export default router;
