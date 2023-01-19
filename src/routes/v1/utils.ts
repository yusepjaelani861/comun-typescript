import express from "express";
import { protect, withtoken } from "../../middleware/auth";
import bodyParser from "body-parser";
import {
    uploadImage,
    uploadVideo,
    validation,
} from "../../controllers/v1/utils";

const router = express.Router();

router
    .route("/upload/image")
    .post(protect, validation("uploadImage"), uploadImage);

router
    .route("/upload/videos")
    .post(bodyParser.raw({ type: 'application/octet-stream', limit: '500mb' }), uploadVideo);


export default router;
