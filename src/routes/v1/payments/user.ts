import express from "express";
import { protect, withtoken } from "../../../middleware/auth";
import {
    balance,
    createPayment,
    getPayment,
    methods,
    removePayment,
    validation,
} from "../../../controllers/v1/payments/user";

const router = express.Router();

router
    .route("/methods")
    .get(protect, methods)

router
    .route("/:slug")
    .get(protect, getPayment)

router
    .route("/:slug/balance")
    .get(protect, balance)

router
    .route("/:slug/create")
    .post(protect, validation("createPayment"), createPayment)

router
    .route("/:slug/:id")
    .delete(protect, removePayment)

export default router;
