import express from "express";
import { withtoken } from "../../../middleware/auth";
import {
    getPublicUser,
} from "../../../controllers/v1/users/public";

const router = express.Router();

router
    .route("/:username")
    .get(withtoken, getPublicUser);

// export { router }
export default router