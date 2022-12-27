import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import asyncHandler from "../../../middleware/async";
import { sendError, sendResponse } from "../../../libraries/rest";
import { body, validationResult } from "express-validator";
import { pagination } from "../../../libraries/helper";
import moment from "moment";
import { stringify, parse } from "himalaya";
import Randomstring from "randomstring";
import { joinedGroup } from "../comunities/helper";
import { convertResPost } from "./helper";

const prisma = new PrismaClient();

export const upvotesDownvotes = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const {
        id,
        action,
    } = req.body;

    const post_action = action, post_id = id;

    const post = await prisma.post.findFirst({
        where: {
            id: post_id
        },
        include: {
            user: true,
            group: true,
        }
    })

    if (!post) {
        return next(new sendError('Post tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    let message: string = '';

    switch (post_action) {
        case 'upvotes': {
            const upvotes = await prisma.postUpvote.findFirst({
                where: {
                    post_id: post_id,
                    user_id: req.user?.id
                }
            })

            if (upvotes) {
                await prisma.postUpvote.delete({
                    where: {
                        id: upvotes.id
                    }
                })
                message = 'Upvotes dihapus';
            }

            if (!upvotes) {
                await prisma.postUpvote.create({
                    data: {
                        post_id: post_id,
                        user_id: req.user?.id,
                        post_user_id: post.user_id
                    }
                })
                message = 'Upvotes ditambahkan';
            }

            break;
        }

        case 'downvotes': {
            const downvotes = await prisma.postDownvote.findFirst({
                where: {
                    post_id: post_id,
                    user_id: req.user?.id
                }
            })

            if (downvotes) {
                await prisma.postDownvote.delete({
                    where: {
                        id: downvotes.id
                    }
                })
                message = 'Downvotes dihapus';
            }

            if (!downvotes) {
                await prisma.postDownvote.create({
                    data: {
                        post_id: post_id,
                        user_id: req.user?.id,
                        post_user_id: post.user_id
                    }
                })
                message = 'Downvotes ditambahkan';
            }

            break;
        }

        default: {
            return next(new sendError('Aksi tidak ditemukan', [], 'NOT_FOUND', 404));
        }
    }

    if (message === 'Upvotes ditambahkan') {
        await prisma.notification.create({
            data: {
                user_id: post.user_id,
                from_user_id: req.user?.id,
                type: 'post_upvote',
                body: `<strong>${req.user?.name}</strong> mendukung postingan anda <strong>${post.title}</strong>`,
                url: `/${post.group?.slug}/${post.slug}`
            }
        })
    }

    if (message === 'Downvotes ditambahkan' || message === 'Upvotes dihapus') {
        await prisma.notification.deleteMany({
            where: {
                user_id: post.user_id,
                from_user_id: req.user?.id,
                type: 'post_upvote',
                url: `/${post.group?.slug}/${post.slug}`
            }
        })
    }

    return res.status(200).json(new sendResponse([], message, [], 200));
});

export const upvotesList = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { slug } = req.params;

    let { page, limit, search, order } = req.query;
    let where: any, orderBy: Array<any> = [];

    page = page ? parseInt(page) : 1;
    limit = limit ? parseInt(limit) : 10;
    order = order ? order : 'desc';

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

    const post = await prisma.post.findFirst({
        where: {
            slug: slug
        }
    })

    if (!post) {
        return next(new sendError('Post tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const post_upvotes = await prisma.postUpvote.findMany({
        where: {
            post_id: post.id
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    username: true,
                    avatar: true,
                }
            }
        },
        orderBy: orderBy.length > 0 ? orderBy : [
            {
                created_at: order
            }
        ],
        take: limit,
        skip: (page - 1) * limit,
    })

    const total = await prisma.postUpvote.count({
        where: {
            post_id: post.id
        }
    })

    return res.json(new sendResponse(post_upvotes, 'Upvotes list', pagination(page, limit, total), 200));
});

export const validation = (method: string) => {
    switch (method) {
        case 'upvotesDownvotes': {
            return [
                body('id', 'Post id tidak boleh kosong').notEmpty(),
                body('action', 'Post action tidak boleh kosong').notEmpty().isIn(['upvotes', 'downvotes']).withMessage('Post action tidak valid'),
            ]
            break;
        }

        default: {
            return [];
        }
    }
}