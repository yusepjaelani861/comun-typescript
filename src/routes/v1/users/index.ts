import express from "express";

import publicRoute from "./public";
import profileRoute from "./profile";
import settingRoute from "./setting";
import configRoute from "./config";
import follwoRoute from "./follow";

const router = express.Router();

router.use("/", profileRoute);
router.use("/", settingRoute);
router.use("/config", configRoute)
router.use("/follow", follwoRoute)
router.use("/", publicRoute);

export default router;