import express from 'express'
import {
    getInterest,
    selectInterest,
    viewInterest,
    validation
} from '../../../controllers/v1/interest/manage'
import { protect, withtoken } from '../../../middleware/auth'

const router = express.Router()

router
    .route('/')
    .get(protect, getInterest)

router
    .route('/me')
    .get(protect, viewInterest)

router
    .route('/select')
    .post(protect, validation('selectInterest'), selectInterest)

export default router