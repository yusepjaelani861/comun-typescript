import express from 'express'
import whatsapp from './whatsapp'

const router = express.Router()

router.use('/', whatsapp)

export default router