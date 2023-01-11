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

export const comments = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
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

    if (post.content_type === 'question') {
        const answer = await prisma.post.findMany({
            where: {
                question_post_id: post.id
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

        await Promise.all(answer.map(async (item) => {
            await convertResPost(item, req.user?.id);
        }))

        const total = await prisma.post.count({
            where: {
                question_post_id: post.id
            }
        })

        return res.json(new sendResponse(answer, 'Berhasil mengambil data', pagination(page, limit, total), 200));
    }

    const comments: any = await prisma.postComment.findMany({
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
            },
            post_comment_upvotes: true,
        },
        orderBy: orderBy.length > 0 ? orderBy : [
            {
                created_at: order
            }
        ],
        skip: (page - 1) * limit,
        take: limit
    })

    const total = await prisma.postComment.count({
        where: {
            post_id: post.id
        }
    })

    await Promise.all(comments.map(async (item: any) => {
        const replies = await prisma.postComment.findMany({
            where: {
                par_comment_id: item.id
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
                post_comment_upvotes: true,
            },
        })

        await Promise.all(replies.map(async (item: any) => {
            item.upvote_count = item.post_comment_upvotes.filter((item: any) => item.type === 'upvote').length;
            item.downvote_count = item.post_comment_upvotes.filter((item: any) => item.type === 'downvote').length;
            item.is_upvote = false;
            item.is_downvote = false;
            if (req.user) {
                item.is_upvote = item.post_comment_upvotes.some((item: any) => item.user_id === req.user.id && item.type === 'upvote') ? true : false;
                item.is_downvote = item.post_comment_downvotes.some((item: any) => item.user_id === req.user.id && item.type === 'downvote') ? true : false;
            }
            item.created_at_formatted = moment(item.created_at).fromNow();

            delete item.post_comment_upvotes;
        }))

        item.reply = replies;
        item.reply_count = replies.length;
        item.upvote_count = item.post_comment_upvotes.filter((item: any) => item.type === 'upvote').length;
        item.downvote_count = item.post_comment_upvotes.filter((item: any) => item.type === 'downvote').length;
        item.is_upvote = false;
        item.is_downvote = false;
        if (req.user) {
            item.is_upvote = item.post_comment_upvotes.some((item: any) => item.user_id === req.user.id && item.type === 'upvote') ? true : false;
            item.is_downvote = item.post_comment_upvotes.some((item: any) => item.user_id === req.user.id && item.type === 'downvote') ? true : false;
        }
        item.created_at_formatted = moment(item.created_at).fromNow();

        delete item.post_comment_upvotes;
    }));

    return res.json(new sendResponse(comments, 'Berhasil mengambil data', pagination(page, limit, total), 200));
})

export const createComment = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const {
        attachment,
        body,
        post_id,
        par_comment_id,
    } = req.body;

    const 
        comment_attachment = attachment,
        comment_body = body,
        comment_post_id = post_id,
        comment_par_comment_id = par_comment_id ? par_comment_id : null;

    const post = await prisma.post.findFirst({
        where: {
            id: comment_post_id
        },
        include: {
            group: true,
        }
    })

    if (!post) {
        return next(new sendError('Post tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const createComment = await prisma.postComment.create({
        data: {
            post_id: comment_post_id,
            user_id: req.user.id,
            par_comment_id: comment_par_comment_id ? comment_par_comment_id : null,
            body: comment_body,
            attachment: comment_attachment,
            post_user_id: post.user_id,
        }
    })

    const comment: any = await prisma.postComment.findFirst({
        where: {
            id: createComment.id
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
            post_comment_upvotes: true,
        }
    })

    comment.reply = [];
    comment.reply_count = 0;
    comment.upvote_count = comment.post_comment_upvotes.filter((item: any) => item.type === 'upvote').length;
    comment.downvote_count = comment.post_comment_upvotes.filter((item: any) => item.type === 'downvote').length;
    comment.is_upvote = false;
    comment.is_downvote = false;
    if (req.user.id) {
        comment.is_upvote = comment.post_comment_upvotes.some((item: any) => item.user_id === req.user.id && item.type === 'upvote') ? true : false;
        comment.is_downvote = comment.post_comment_upvotes.some((item: any) => item.user_id === req.user.id && item.type === 'downvote') ? true : false;
    }
    comment.created_at_formatted = moment(comment.created_at).fromNow();

    delete comment.post_comment_upvotes;

    const cek_user_config = await prisma.userConfig.findFirst({
        where: {
            user_id: post.user_id,
            config: {
                label: 'notification_comment'
            }
        },
        include: {
            config: true
        }
    })

    if (cek_user_config?.value === true) {
        await prisma.notification.create({
            data: {
                user_id: post.user_id,
                from_user_id: req.user?.id,
                body: `<strong>${req.user?.name}</strong> mengomentari postingan anda <strong>${post.title}</strong>`,
                type: 'comment',
                url: `/${post.group.slug}/${post.slug}`
            }
        })
    }

    return res.json(new sendResponse(comment, 'Berhasil membuat komentar', [], 200));
})

export const commentUpvoteDownvote = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const {
        id,
        action
    } = req.body;
    const 
        comment_id = id,
        comment_action = action;

    const comment = await prisma.postComment.findFirst({
        where: {
            id: comment_id
        },
        include: {
            post: {
                include: {
                    group: true
                }
            }
        }
    })

    if (!comment) {
        return next(new sendError('Komentar tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    let message: string = "";

    switch (comment_action) {
        case 'upvotes': {
            const downvote = await prisma.postCommentVotes.findFirst({
                where: {
                    post_comment_id: comment_id,
                    user_id: req.user.id,
                    type: 'downvote'
                }
            })

            if (downvote) {
                await prisma.postCommentVotes.delete({
                    where: {
                        id: downvote.id
                    }
                })
            }

            const upvote = await prisma.postCommentVotes.findFirst({
                where: {
                    post_comment_id: comment_id,
                    user_id: req.user.id,
                    type: 'upvote'
                }
            })

            if (upvote) {
                await prisma.postCommentVotes.delete({
                    where: {
                        id: upvote.id
                    }
                })
                message = "Berhasil menghapus upvote";
            }

            if (!upvote) {
                await prisma.postCommentVotes.create({
                    data: {
                        post_comment_id: comment_id,
                        user_id: req.user.id,
                        post_comment_user_id: comment.user_id,
                        type: 'upvote'
                    }
                })
                message = "Berhasil melakukan upvote";
            }

            break;
        }

        case 'downvotes': {
            const upvote = await prisma.postCommentVotes.findFirst({
                where: {
                    post_comment_id: comment_id,
                    user_id: req.user.id,
                    type: 'upvote'
                }
            })

            if (upvote) {
                await prisma.postCommentVotes.delete({
                    where: {
                        id: upvote.id
                    }
                })
            }

            const downvote = await prisma.postCommentVotes.findFirst({
                where: {
                    post_comment_id: comment_id,
                    user_id: req.user.id,
                    type: 'downvote'
                }
            })

            if (downvote) {
                await prisma.postCommentVotes.delete({
                    where: {
                        id: downvote.id
                    }
                })
                message = "Berhasil menghapus downvote";
            }

            if (!downvote) {
                await prisma.postCommentVotes.create({
                    data: {
                        post_comment_id: comment_id,
                        user_id: req.user.id,
                        post_comment_user_id: comment.user_id,
                        type: 'downvote'
                    }
                })
                message = "Berhasil melakukan downvote";
            }

            break;
        }

        default: {
            return next(new sendError('Aksi tidak ditemukan', [], 'NOT_FOUND', 404));
        }
    }

    if (message == 'Berhasil melakukan upvote') {
        if (comment.user_id != req.user.id) {
            const cek_user_config = await prisma.userConfig.findFirst({
                where: {
                    user_id: comment.user_id,
                    config: {
                        label: 'notification_comment'
                    }
                },
                include: {
                    config: true
                }
            })

            if (cek_user_config?.value === true) {
                await prisma.notification.create({
                    data: {
                        user_id: comment.user_id,
                        from_user_id: req.user?.id,
                        body: `<strong>${req.user?.name}</strong> mendukung komentar anda <strong>${comment.body}</strong>`,
                        type: 'comment_upvote',
                        url: `/${comment.post.group.slug}/${comment.post.slug}`
                    }
                })
            }
        }
    }

    if (message = 'Berhasil menghapus upvote' || message == 'Berhasil melakukan downvote') {
        await prisma.notification.deleteMany({
            where: {
                user_id: comment.user_id,
                from_user_id: req.user?.id,
                type: 'comment_upvote',
                url: `/${comment.post.group.slug}/${comment.post.slug}`
            }
        })
    }

    return res.json(new sendResponse([], message, [], 200));
})

export const validation = (method: string) => {
    switch (method) {
        case 'createComment': {
            return [
                body("attachment").optional(),
                body("body").notEmpty().withMessage("Comment body is required"),
                body("post_id").notEmpty().withMessage("Comment post id is required"),
                body("par_comment_id").optional(),
            ];

            break;
        }

        case 'commentUpvoteDownvote': {
            return [
                body("id").notEmpty().withMessage("id comment is required"),
                body("action").notEmpty().withMessage("action comment is required").isIn(['upvotes', 'downvotes']).withMessage("Comment action is invalid"),
            ]
            break;
        }

        default: {
            return [];
        }
    }
}