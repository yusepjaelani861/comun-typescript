import express from 'express'
import {
    sendWhatsapp
} from '../../../controllers/v1/handleAPI/whatsapp'

const router = express.Router()

router
    .route('/send/whatsapp')
    .post(sendWhatsapp)

export default router