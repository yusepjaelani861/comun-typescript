import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import asyncHandler from "../../../middleware/async";
import { sendError, sendResponse } from "../../../libraries/rest";
import { body, validationResult } from "express-validator";
import { pagination } from "../../../libraries/helper";
import moment from "moment";
import { stringify, parse } from "himalaya";


const prisma = new PrismaClient();

export const test = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const bodies = '<p>test</p>'

    const parseContent = parse(bodies)

    console.log(parseContent)

    return res.status(200).json(new sendResponse(parseContent, 'Config found', {}, 200));
})