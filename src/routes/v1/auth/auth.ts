import express from 'express'
import {
    cek_otp,
    login,
    register,
    send_otp,
    verify_and_update, 
    logout,
    check_username,
    validation,   
} from '../../../controllers/v1/auth/auth'

import { protect, withtoken } from '../../../middleware/auth'

const router = express.Router()

router
    .route('/register/:type')
    .post(register)

router
    .route('/login/:type')
    .post(validation('login'), login)

router
    .route('/send/otp')
    .post(validation('send_otp'), send_otp)

router
    .route('/check/otp')
    .post(validation('cek_otp'), cek_otp)

router
    .route('/check/username')
    .post(validation('check_username'), check_username)

router
    .route('/update/verify')
    .post(validation('verify_and_update'), verify_and_update)

router
    .route('/logout')
    .post(protect, logout)

export default router