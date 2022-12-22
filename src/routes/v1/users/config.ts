import express from "express";
import { protect } from "../../../middleware/auth";
import {
    listConfig,
    getMyConfig,
    updateMyConfig,
    validation,
} from "../../../controllers/v1/users/config";

import {
    sendCode,
    verifyCode,
    changeEmail,
    validation as profileValidation,
} from "../../../controllers/v1/users/setting";

const router = express.Router();

router
    .route('/list')
    .get(protect, listConfig);

router
    .route('/')
    .get(protect, getMyConfig)

router
    .route('/update')
    .post(protect, validation('updateMyConfig'), updateMyConfig);

router
    .route('/send_code')
    .post(protect, profileValidation('sendCode'), sendCode);

router
    .route('/verify_code')
    .post(protect, profileValidation('verifyCode'), verifyCode);

router
    .route('/change_email')
    .post(protect, profileValidation('changeEmail'), changeEmail);

export default router;

