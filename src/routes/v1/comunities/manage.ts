import express from "express";
import { withtoken, protect } from "../../../middleware/auth";
import {
    createComunity,
    exitComunity,
    joinComunity,
    listComunity,
    listMemberComunity,
    listAllMember,
    validation,
} from "../../../controllers/v1/comunities/manage";

const router = express.Router();

router
    .route("/")
    .get(protect, listComunity);

router
    .route("/create")
    .post(protect, validation('createComunity'), createComunity);

router
    .route("/:slug/join")
    .post(protect, joinComunity);

router
    .route("/:slug/exit")
    .post(protect, exitComunity);   

router
    .route("/:slug/members")
    .get(protect, listMemberComunity);

router 
    .route("/:slug/members/all")
    .get(protect, listAllMember);

export default router;