import express from "express";
import { protect, withtoken } from "../../../middleware/auth";
import {
    createVotePost,
    votePostOption,
    validation,
} from "../../../controllers/v1/posts/votes";

const router = express.Router();


router
    .route("/create/votes")
    .post(protect, validation("createVotePost"), createVotePost);

router
    .route("/votes/option")
    .post(protect, validation("votePostOption"), votePostOption);

export default router;