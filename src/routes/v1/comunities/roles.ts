import express from "express";
import { withtoken, protect } from "../../../middleware/auth";
import {
    changeRoleMember,
    changeStatusPermission,
    createRoles,
    listPermissionRoles,
    listRolePerComunity,
    validation,
} from "../../../controllers/v1/comunities/roles";

const router = express.Router();

router
    .route("/permission")
    .get(protect, listPermissionRoles);

router
    .route("/:slug/roles/change/member")
    .post(protect, validation('changeRoleMember'), changeRoleMember);

router
    .route("/:slug/roles/add")
    .post(protect, validation('createRoles'), createRoles);

router
    .route("/:slug/roles")
    .get(protect, listRolePerComunity);

router
    .route("/:slug/roles/status")
    .post(protect, validation('changeStatusPermission'), changeStatusPermission);

export default router;