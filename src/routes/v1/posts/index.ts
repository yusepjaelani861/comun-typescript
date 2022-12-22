import express from "express";

import managePosts from "./manage";

const router = express.Router();

router.use("/", managePosts);

export default router;