import express from "express";
import { protect, withtoken } from "../../../middleware/auth";
import {
    commentUpvoteDownvote,
    comments,
    createComment,
    validation,
} from "../../../controllers/v1/posts/comment";

const router = express.Router();

router
    .route("/comment/:slug")
    .get(withtoken, comments)

router
    .route("/comment/create")
    .post(protect, validation("createComment"), createComment);

router
    .route("/comment/upvotes")
    .post(protect, validation('commentUpvoteDownvote'), commentUpvoteDownvote);

export default router;