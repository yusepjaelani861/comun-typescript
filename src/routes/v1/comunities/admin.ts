import express from "express";
import { withtoken, protect } from "../../../middleware/auth";
import {
    actionRequestJoin,
    editComunity,
    kickMember,
    requestJoinComunity,
    validation,
} from "../../../controllers/v1/comunities/admin";

const router = express.Router();

router
    .route('/edit/:slug')
    .post(protect, validation('editComunity'), editComunity);

router
    .route("/:slug/members/kick")
    .post(protect, validation('kickMember'), kickMember);

router
    .route('/:slug/requests')
    .get(protect, requestJoinComunity);

router
    .route('/:slug/requests/action')
    .post(protect, validation('actionRequestJoin'), actionRequestJoin);

export default router;