import express from "express";
import { withtoken, protect } from "../../../middleware/auth";
import {
    checkComunityID,
    listAllComunity,
    viewComunity,
    validation,
} from "../../../controllers/v1/comunities/public";

const router = express.Router();

router
    .route("/check")
    .post(protect, validation('checkComunityID'), checkComunityID)

router
    .route("/list")
    .get(withtoken, listAllComunity);

router
    .route("/:slug")
    .get(withtoken, viewComunity);

export default router;