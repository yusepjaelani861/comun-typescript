import express from 'express'
import {
    followUser,
    listFollow,
    validation
} from '../../../controllers/v1/users/follow'
import { protect, withtoken } from '../../../middleware/auth'

const router = express.Router()

router
    .route('/action')
    .post(protect, validation('followUser'), followUser)

router
    .route('/:username')
    .get(withtoken, listFollow)

export default router