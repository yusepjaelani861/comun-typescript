import express from "express";
import { protect, withtoken } from "../../../middleware/auth";
import {
    requestPayout,
    transactions,
    validation,
} from "../../../controllers/v1/payments/transaction";


const router = express.Router();

router
    .route("/:slug/transactions")
    .get(protect, transactions)

router
    .route("/:slug/payout")
    .post(protect, validation("requestPayout"), requestPayout)

export default router;