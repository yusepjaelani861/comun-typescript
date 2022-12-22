import express from "express";
import { protect } from "../../../middleware/auth";
import {
    test
} from "../../../controllers/v1/posts/manage";

const router = express.Router();

router
    .route("/test")
    .get(test);

export default router;