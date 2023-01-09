import express from 'express';

import { 
    loginGoogle,
    callbackGoogle,
} from '../../../controllers/v1/auth/authgoogle';

import { protect, withtoken } from '../../../middleware/auth';

const router = express.Router();

router
    .route('/login/google')
    .get(loginGoogle);

router
    .route('/google/callback')
    .get(callbackGoogle);

export default router;