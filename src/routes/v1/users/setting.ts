import express from "express";
import { protect } from "../../../middleware/auth";
import {
    updatePassword,
    validation,
} from "../../../controllers/v1/users/setting";

const router = express.Router();

router
    .route("/update/password")
    .post(protect, validation('updatePassword'), updatePassword);

// router
//     .route("/send/code")
//     .post(protect, validation('sendCode'), sendCode);

// router
//     .route("/verify/code")
//     .post(protect, validation('verifyCode'), verifyCode);

// router
//     .route("/change/email")
//     .post(protect, validation('changeEmail'), changeEmail);


export default router;