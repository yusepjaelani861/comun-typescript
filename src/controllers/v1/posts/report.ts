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

export const reportPost = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const {
        post_id,
        reason,
        body,
    } = req.body;

    const 
        report_reason = reason,
        report_body = body;

    let where: any = {};

    const post = await prisma.post.findFirst({
        where: {
            id: post_id,
            OR: [
                {
                    status: 'published'
                },
                {
                    status: 'report'
                }
            ]
        },
    })

    if (!post) {
        return next(new sendError('Post tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    where = {
        id: post.group_id,
    };

    const group = await prisma.group.findFirst({
        where: where,
        include: {
            group_members: true,
        }
    })

    if (!group) {
        return next(new sendError('Group tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    if (req.user && group.privacy !== 'public') {
        const joined = await joinedGroup(group, req.user?.id)
        if (!joined) {
            return next(new sendError('Anda belum bergabung dalam group', [], 'PROCESS_ERROR', 404));
        }
    }

    const report = await prisma.postReport.create({
        data: {
            post_id: post.id,
            user_id: req.user?.id,
            group_id: group.id,
            reason: report_reason,
            body: report_body,
        }
    })

    const updatePost = await prisma.post.update({
        where: {
            id: post.id
        },
        data: {
            status: 'report'
        }
    })

    return res.status(200).json(new sendResponse([], 'Berhasil melaporkan post', [], 200));
})

export const reports = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
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

    const reports: any = await prisma.postReport.findMany({
        where: {
            group_id: group.id,
            post: {
                status: 'report',
                title: {
                    contains: search ? search : '',
                    mode: 'insensitive'
                }
            }
        },
        include: {
            post: {
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
                    post_upvotes: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    username: true,
                                    avatar: true,
                                }
                            }
                        }
                    },
                    post_vote_options: {
                        include: {
                            post_vote_members: {
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
                                take: 3,
                            }
                        }
                    },
                },
            },
            user: {
                select: {
                    id: true,
                    name: true,
                    username: true,
                    avatar: true,
                }
            },
        },
        orderBy: orderBy.length > 0 ? orderBy : [
            {
                created_at: order
            }
        ],
        take: limit,
        skip: (page - 1) * limit,
    })

    await Promise.all(reports.map(async (report: any) => {
        await convertResPost(report.post, req.user?.id);   
    }))

    const total = await prisma.postReport.count({
        where: {
            group_id: group.id
        }
    })

    return res.status(200).json(new sendResponse(reports, 'Berhasil mengambil data', pagination(page, limit, total), 200));
})

export const actionReport = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const {
        post_id,
        action
    } = req.body;

    const report_action = action;

    const post = await prisma.post.findFirst({
        where: {
            id: post_id,
            status: 'report'
        }
    })

    if (!post) {
        return next(new sendError('Post report tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    let message: string = "Berhasil mengambil data";
    try {
        await prisma.$transaction(async (prisma) => {
            switch (report_action) {
                case 'delete': {
                    await prisma.postReport.deleteMany({
                        where: {
                            post_id: post.id
                        }
                    })

                    await prisma.post.delete({
                        where: {
                            id: post.id
                        }
                    })

                    message = "Berhasil menghapus post";

                    break;
                }

                case 'ignore': {
                    await prisma.postReport.deleteMany({
                        where: {
                            post_id: post.id
                        }
                    })

                    await prisma.post.update({
                        where: {
                            id: post.id
                        },
                        data: {
                            status: 'published'
                        }
                    })

                    message = "Berhasil mengabaikan post";

                    break;
                }

                default: {
                    return next(new sendError('Aksi tidak ditemukan', [], 'NOT_FOUND', 404));
                }
            }
        })

        return res.status(200).json(new sendResponse([], message, [], 200));
    } catch (error) {
        return next(new sendError('Terjadi kesalahan', [], 'PROCESS_ERROR', 400));
    }
})

export const validation = (method: string) => {
    switch (method) {
        case 'reportPost': {
            return [
                body("post_id", "Post id is required").exists(),
                body("reason", "Reason report is required")
                    .exists()
                    .isIn([
                        "nudity",
                        "spam",
                        "violence",
                        "suicidal",
                        "falseinformation",
                        "hatespeech",
                        "terrorism",
                        "other",
                    ]),
                body("body", "Body report is required").exists(),
            ]
            break;
        }

        case 'actionReport': {
            return [
                body("post_id", "Post id is required").exists(),
                body("action", "Action report is required")
                    .exists()
                    .isIn(["delete", "ignore"]),
            ]
            break;
        }

        default: {
            return []
        }
    }
}