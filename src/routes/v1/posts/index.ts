import express from "express";

import managePosts from "./manage";
import requestPosts from "./request";

const router = express.Router();

router.use("/", requestPosts);
router.use("/", managePosts);

export default router;