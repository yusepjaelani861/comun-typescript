import express from "express";

import managePosts from "./manage";
import requestPosts from "./request";
import commentPosts from "./comment";
import upvotePosts from "./upvotes";
import votePosts from "./votes";
import tagPosts from "./tags";
import reportPosts from "./report";

const router = express.Router();

router.use("/", reportPosts);
router.use("/", commentPosts);
router.use("/", tagPosts);
router.use("/", upvotePosts);
router.use("/", votePosts);
router.use("/", requestPosts);
router.use("/", managePosts);

export default router;