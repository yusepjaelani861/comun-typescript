import express from 'express';

import { 
    register_email,
    send_otp,
    check_otp,
    check_username,
    verify_and_update,
    login_email,
    logout,
    validation,
} from '../../../controllers/v1/auth/authentication';

import { protect, withtoken } from '../../../middleware/auth';

const router = express.Router();

router
    .route('/login/email')
    .post(validation('login_email'), login_email);

router
    .route('/register/email')
    .post(validation('register_email'), register_email);

router
    .route('/send/otp')
    .post(validation('send_otp'), send_otp);

router
    .route('/check/otp')
    .post(validation('check_otp'), check_otp);

router
    .route('/check/username')
    .post(validation('check_username'), check_username);

router
    .route('/update/verify')
    .post(validation('verify_and_update'), verify_and_update);

router
    .route('/logout')
    .post(protect, validation('logout'), logout);

export default router;