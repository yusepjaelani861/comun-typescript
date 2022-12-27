import express from "express";
import { protect, withtoken } from "../../../middleware/auth";
import {
    upvotesDownvotes,
    upvotesList,
    validation,
} from "../../../controllers/v1/posts/upvotes";

const router = express.Router();

router
    .route("/votes/:slug")
    .get(protect, upvotesList)

router
    .route("/votes")
    .post(protect, validation("upvotesDownvotes"), upvotesDownvotes);

export default router;