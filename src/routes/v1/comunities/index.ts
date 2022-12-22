import express from "express";
import manageComunity from "./manage";
import adminComunity from "./admin";
import publicComunity from './public';
import navigationComunity from './navigation';

const router = express.Router();

router.use("/", publicComunity);
router.use("/", navigationComunity);
router.use("/", manageComunity);
router.use("/", adminComunity);

export default router;