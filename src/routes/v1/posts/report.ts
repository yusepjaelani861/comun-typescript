import express from "express";
import { protect, withtoken } from "../../../middleware/auth";
import {
    actionReport,
    reportPost,
    reports,
    validation,
} from "../../../controllers/v1/posts/report";

const router = express.Router();

router
    .route("/report")
    .post(protect, validation("reportPost"), reportPost)

router
    .route("/report/:slug")
    .get(protect, reports)

router
    .route("/report/:slug/action")
    .post(protect, validation("actionReport"), actionReport)

export default router;