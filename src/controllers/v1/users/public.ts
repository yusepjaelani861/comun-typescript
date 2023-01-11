import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import asyncHandler from "../../../middleware/async";
import { sendError, sendResponse } from "../../../libraries/rest";

const prisma = new PrismaClient()

export const getPublicUser = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { username } = req.params;

    let user: any = await prisma.user.findFirst({
        where: {
            username: username
        },
        select: {
            id: true,
            name: true,
            username: true,
            bio: true,
            avatar: true,
            followers: true,
            followings: true,
        },
    });

    if (!user) {
        return next(new sendError('User not found', [], 'NOT_FOUND', 404));
    }

    user.is_follow = user.followers.some((follower: any) => follower.follow_user_id === req.user?.id) ? true : false

    user.total_followers = user.followers.length
    user.total_followings = user.followings.length

    delete user.followers
    delete user.followings

    return res.status(200).json(new sendResponse(user, 'User found', {}, 200));
})