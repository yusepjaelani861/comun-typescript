import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import asyncHandler from "../../../middleware/async";
import { sendError, sendResponse } from "../../../libraries/rest";
import { pagination } from "../../../libraries/helper";
import { convertUser } from './helper'

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

export const getAllUser = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    let { page, limit, search, order } = req.query;

    res.json(req.query.haha);

    page = page ? parseInt(page) : 1;
    limit = limit ? parseInt(limit) : 10;
    order = order ? order : 'desc';

    let where: any, orderBy: Array<any> = [];

    if (Object.keys(req.query).length > 0) {
        Object.keys(req.query).forEach((filter, index) => {
            let key_and_op = filter.split('.');

            if (key_and_op.length > 1) {
                let key = key_and_op[0];
                let op = key_and_op[1];
                let value = req.query[filter];

                if (key == 'sort') {
                    orderBy.push({
                        [op]: value
                    })
                }
            }
        })
    }

    if (search) {
        where = {
            OR: [
                {
                    name: {
                        contains: search
                    }
                },
                {
                    username: {
                        contains: search
                    }
                }
            ]
        }
    }

    const users = await prisma.user.findMany({
        where: {
            ...where
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
        orderBy: orderBy,
        skip: (page - 1) * limit,
        take: limit,
    });

    await Promise.all(users.map(async (user: any) => {
       convertUser(user, req.user?.id); 
    }))

    const total_users = await prisma.user.count({
        where: {
            ...where
        }
    })

    return res.json(new sendResponse(users, 'Users found', pagination(page, limit, total_users), 200))
})