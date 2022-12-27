import express from "express";
import { protect, withtoken } from "../../../middleware/auth";
import {
    createTag,
    listPostByTag,
    tags,
    validation,
} from "../../../controllers/v1/posts/tags";

const router = express.Router();

router
    .route("/tags")
    .get(withtoken, tags)

router
    .route("/tags/create")
    .post(protect, validation("createTag"), createTag)

router
    .route("/tags/posts")
    .get(withtoken, listPostByTag)

export default router;