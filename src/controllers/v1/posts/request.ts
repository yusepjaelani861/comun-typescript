import { Request, Response, NextFunction } from "express";
import { PostStatus, PrismaClient } from "@prisma/client";
import asyncHandler from "../../../middleware/async";
import { sendError, sendResponse } from "../../../libraries/rest";
import { body, validationResult } from "express-validator";
import { pagination } from "../../../libraries/helper";
import moment from "moment";
import { stringify, parse } from "himalaya";
import Randomstring from "randomstring";
import { joinedGroup, myPermissionGroup } from "../comunities/helper";
import { convertResPost } from "./helper";

const prisma = new PrismaClient();

export const requestPost = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
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

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const permission = myPermissionGroup(group, req.user.id, 'terima_dan_tolak_permintaan_postingan');

    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses', [], 'PROCESS_ERROR', 400));
    }

    where = {
        group_id: group.id,
        status: 'pending'
    };

    if (search) {
        where = {
            ...where,
            OR: [
                {
                    title: {
                        contains: search
                    },
                },
                {
                    slug: {
                        contains: search.toLowerCase()
                    },
                },
            ]
        }
    }

    const requestPost = await prisma.post.findMany({
        where: where,
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    username: true,
                    avatar: true,
                }
            },
            group: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    avatar: true,
                    privacy: true,
                },
            },
            post_comments: true,
            post_upvotes: true,
            post_downvotes: true,
            post_vote_options: true,
        },
        orderBy: orderBy.length > 0 ? orderBy : [
            {
                created_at: order
            }
        ],
        skip: (page - 1) * limit,
        take: limit
    })

    const total = await prisma.post.count({
        where: {
            group_id: group.id,
            status: 'pending'
        }
    })

    await Promise.all(requestPost.map(async (posts: any) => {
        convertResPost(posts);
    }))

    return res.status(200).json(new sendResponse(requestPost, 'Berhasil mengambil data', pagination(page, limit, total), 200));
})

export const actionRequestPost = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { slug } = req.params;

    const {
        post_id,
        post_status
    } = req.body;

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const permission = myPermissionGroup(group, req.user.id, 'terima_dan_tolak_permintaan_postingan');

    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses', [], 'PROCESS_ERROR', 400));
    }

    const post = await prisma.post.findFirst({
        where: {
            id: post_id,
            group_id: group.id,
            status: 'pending'
        }
    })

    if (!post) {
        return next(new sendError('Permintaan post tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    await prisma.post.update({
        where: {
            id: post.id
        },
        data: {
            status: post_status
        }
    })

    return res.status(200).json(new sendResponse([], 'Berhasil melakukan action pada permintaan postingan', [], 200));
})

export const viewRequestPost = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { slug, post_slug } = req.params;

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const permission = myPermissionGroup(group, req.user.id, 'terima_dan_tolak_permintaan_postingan');

    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses', [], 'PROCESS_ERROR', 400));
    }

    const post: any = await prisma.post.findFirst({
        where: {
            slug: post_slug,
            group_id: group.id,
            status: 'pending'
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    username: true,
                    avatar: true,
                }
            },
            group: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    avatar: true,
                    privacy: true,
                },
            },
            post_comments: true,
            post_upvotes: true,
            post_downvotes: true,
            post_vote_options: true,
        },
    })

    if (!post) {
        return next(new sendError('Permintaan post tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    let url: string;
    if (post.post_content_type === 'answer_question') {
        const posts_before: any = await prisma.post.findFirst({
            where: {
                id: post.post_question_id
            },
        })

        url = '/' + post.group.slug + '/' + posts_before.slug + '/' + post.slug;
    } else {
        url = '/' + post.group.slug + '/' + post.slug;
    }

    convertResPost(post);

    return res.status(200).json(new sendResponse(post, 'Berhasil mengambil data', [], 200));
})

export const validation = (method: string) => {
    switch (method) {
        case 'actionRequestPost': {
            return [
                body("post_id")
                    .notEmpty()
                    .withMessage("Post id is required")
                    .isInt()
                    .withMessage("Post id must be integer"),
                body("post_status")
                    .notEmpty()
                    .withMessage("Post status is required")
                    .isIn(["published", "rejected"])
                    .withMessage("Post status must be published or rejected"),
            ]
        }

        default: {
            return []
        }
    }
}