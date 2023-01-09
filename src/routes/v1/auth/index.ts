import express from 'express'

import auth from './authentication'
import authgoogle from './authgoogle'

const router = express.Router()

router.use('/', auth)
router.use('/', authgoogle)

export default router