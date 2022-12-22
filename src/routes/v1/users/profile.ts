import express from "express";
import { protect } from "../../../middleware/auth";
import {
    getProfile,
    updateProfile,
    updateAvatar,
    validation,
} from "../../../controllers/v1/users/profile";

const router = express.Router();

router
    .route("/me")
    .get(protect, getProfile);

router
    .route("/update/profile")
    .post(protect, validation('updateProfile'), updateProfile);

router
    .route("/update/avatar")
    .post(protect, validation('updateAvatar'), updateAvatar);


export default router;