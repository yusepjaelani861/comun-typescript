import express from 'express'
import manageRoute from './manage'

const router = express.Router()

router.use('/', manageRoute)

export default router