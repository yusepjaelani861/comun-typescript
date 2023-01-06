import express from "express";
import { withtoken, protect } from "../../../middleware/auth";
import {
    settings,
    addFormulir,
    deleteFormulir,
    listFormulir,
    settingPrivacy,
    togglePermission,
    updateFormulir,
    validation,
} from "../../../controllers/v1/comunities/setting";

const router = express.Router();

router
    .route('/:slug/setting')
    .get(protect, settings);

router
    .route("/:slug/setting/privacy")
    .post(protect, validation('settingPrivacy'), settingPrivacy);

router
    .route("/:slug_group/setting/permission")
    .post(protect, validation('togglePermission'), togglePermission);

router
    .route("/:slug/setting/formulir")
    .get(protect, listFormulir);

router
    .route("/:slug_group/setting/formulir")
    .post(protect, validation('addFormulir'), addFormulir);

router
    .route("/:slug/setting/formulir/update")
    .post(protect, validation('updateFormulir'), updateFormulir);

router
    .route("/:slug_group/setting/formulir/:id")
    .delete(protect, deleteFormulir);

export default router;