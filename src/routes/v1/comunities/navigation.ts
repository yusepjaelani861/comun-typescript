import express from "express";
import { withtoken, protect } from "../../../middleware/auth";
import {
    addNavigation,
    listNavigation,
    removeNavigation,
    updateOrderNavigation,
    validation,
} from "../../../controllers/v1/comunities/navigation";

import {
    listNavigationGroup,
    permissionAccessPage,
} from "../../../controllers/v1/comunities/navigation_public";

const router = express.Router();

router
    .route("/navigation/:slug")
    .get(withtoken, listNavigationGroup);

router
    .route("/navigation/:slug/:type")
    .get(withtoken, permissionAccessPage);

router
    .route("/:slug/navigation/add")
    .post(protect, validation('addNavigation'), addNavigation);

router
    .route("/:slug/navigation/:id")
    .delete(protect, removeNavigation);

router
    .route("/:slug/navigation")
    .get(protect, listNavigation);

router
    .route("/:slug/navigation/order")
    .post(protect, validation('updateOrderNavigation'), updateOrderNavigation);

export default router;
