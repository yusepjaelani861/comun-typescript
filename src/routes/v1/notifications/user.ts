import express from "express";
import { protect, withtoken } from "../../../middleware/auth";
import {
    hasUnread,
    notifications,
    readNotification,
    validation,
} from "../../../controllers/v1/notifications/user";

const router = express.Router();

router
    .route("/")
    .get(protect, notifications)

router
    .route("/read")
    .post(protect, validation("readNotification"), readNotification)

router
    .route("/has")
    .get(protect, hasUnread)

export default router;