import express from "express";

import userPayment from "./user";
import transactionPayment from "./transaction";

const router = express.Router();

router.use("/", userPayment);
router.use("/", transactionPayment);

export default router;