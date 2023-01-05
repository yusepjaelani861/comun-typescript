import express from "express";
import { protect, withtoken } from "../../../middleware/auth";
import cache from "../../../middleware/cache";
import {
    analytics,
} from "../../../controllers/v1/analytics/dashboard";

const router = express.Router();

router
    .route("/:slug")
    .get(protect, cache(60), analytics)

export default router;