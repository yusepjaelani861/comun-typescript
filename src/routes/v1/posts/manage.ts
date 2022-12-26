import express from "express";
import { protect, withtoken } from "../../../middleware/auth";
import {
    createPost,
    deletePost,
    posts,
    updatePost,
    validation,
} from "../../../controllers/v1/posts/manage";

const router = express.Router();

router
    .route("/create")
    .post(protect, validation("createPost"), createPost);

router
    .route("/update/:slug")
    .post(protect, validation("updatePost"), updatePost);

router
    .route("/delete/:slug")
    .delete(protect, deletePost);

router
    .route("/:type")
    .get(withtoken, posts)

router
    .route("/:type/:slug")
    .get(withtoken, posts)

export default router;