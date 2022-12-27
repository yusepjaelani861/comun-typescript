import express from "express";

import userNotification from "./user";

const router = express.Router();

router.use("/", userNotification);

export default router;