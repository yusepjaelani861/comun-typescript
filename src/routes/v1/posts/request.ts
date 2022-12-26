import express from "express";
import { protect, withtoken } from "../../../middleware/auth";
import {
    actionRequestPost,
    requestPost,
    viewRequestPost,
    validation,
} from "../../../controllers/v1/posts/request";

const router = express.Router();

router
    .route("/:slug/request")
    .get(protect, requestPost)

router
    .route("/:slug/request/action")
    .post(protect, validation("actionRequestPost"), actionRequestPost)

router
    .route("/:slug/request/:post_slug")
    .get(protect, viewRequestPost)

export default router;