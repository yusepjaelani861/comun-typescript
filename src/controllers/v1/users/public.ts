import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import asyncHandler from "../../../middleware/async";
import { sendError, sendResponse } from "../../../libraries/rest";

const prisma = new PrismaClient()

export const getPublicUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { username } = req.params;

    const user = await prisma.user.findFirst({
        where: {
            username: username
        },
        select: {
            id: true,
            name: true,
            username: true,
            bio: true,
            avatar: true,
        }
    });

    if (!user) {
        return next(new sendError('User not found', [], 'NOT_FOUND', 404));
    }

    return res.status(200).json(new sendResponse(user, 'User found', {}, 200));
})