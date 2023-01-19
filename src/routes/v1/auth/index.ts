import express from 'express'

// import auth from './authentication'
import auth from './auth';
import authgoogle from './authgoogle'
import authfacebook from './authfacebook'

const router = express.Router()

router.use('/', auth)
router.use('/', authgoogle)
router.use('/', authfacebook)

export default router