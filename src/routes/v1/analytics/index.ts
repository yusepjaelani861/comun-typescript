import express from "express";

import dashboardAnalytic from "./dashboard";

const router = express.Router();

router.use("/", dashboardAnalytic);

export default router;