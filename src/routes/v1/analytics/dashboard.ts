import express from "express";
import { protect, withtoken } from "../../../middleware/auth";
import {
    analytics,
} from "../../../controllers/v1/analytics/dashboard";

const router = express.Router();

router
    .route("/:slug")
    .get(protect, analytics)

export default router;