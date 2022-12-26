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

export const createVotePost = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const {
        post_title,
        post_body,
        post_group_id,
        post_vote_options
    } = req.body;

    let body_to_json: any, slug: string;

    const group = await prisma.group.findFirst({
        where: {
            id: post_group_id
        }
    })

    if (!group) {
        return next(new sendError('Group tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const joined = await joinedGroup(req.user?.id, group.id);

    if (!joined) {
        return next(new sendError('Anda belum bergabung dengan group', [], 'NOT_FOUND', 404));
    }

    if (post_body) {
        body_to_json = parse(post_body);
    }

    slug = post_title.toLowerCase().replace(/[^\w ]/g, "").replace(/\s+/g, "-");
    let i = 1;
    while (await prisma.post.findFirst({
        where: {
            slug: slug
        }
    })) {
        slug = slug + '-' + i;
        i++;
    }

    const post = await prisma.post.create({
        data: {
            title: post_title,
            body: body_to_json,
            slug: slug,
            group_id: post_group_id,
            user_id: req.user?.id,
            seo_description: post_body ? post_body.substring(0, 160) : '',
            seo_title: post_title,
            content_type: 'voting',
            status: group.privacy == 'public' ? 'published' : 'pending',
        }
    })

    await Promise.all(post_vote_options.map(async (option: any) => {
        await prisma.postVoteOption.create({
            data: {
                post_id: post.id,
                name: option.name,
                image: option.image,
                user_id: req.user?.id,
            }
        })
    }))

    return res.status(200).json(new sendResponse([], 'Berhasil membuat post', [], 200));
})

export const votePostOption = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const {
        vote_option_id,
    } = req.body;

    const vote_option = await prisma.postVoteOption.findFirst({
        where: {
            id: vote_option_id
        }
    })

    if (!vote_option) {
        return next(new sendError('Pilihan tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const post_vote_member = await prisma.postVoteMember.findMany({
        where: {
            post_id: vote_option.post_id,
            user_id: req.user?.id
        }
    })

    let message: string = "";
    if (post_vote_member.length > 0) {
        await prisma.postVoteMember.deleteMany({
            where: {
                post_id: vote_option.post_id,
                user_id: req.user?.id
            }
        })
        message = 'Berhasil membatalkan pilihan';
    }

    if (post_vote_member.length === 0) {
        await prisma.postVoteMember.create({
            data: {
                post_id: vote_option.post_id,
                user_id: req.user?.id,
                post_option_id: vote_option.id,
            }
        })
        message = 'Berhasil memilih';
    }

    return res.status(200).json(new sendResponse([], message, [], 200));
})

export const validation = (method: string) => {
    switch (method) {
        case 'createVotePost': {
            return [
                body('post_title', 'Judul harus diisi').notEmpty(),
                body('post_body').optional(),
                body('post_group_id', 'Group harus diisi').notEmpty(),
                body("post_vote_options")
                    .notEmpty()
                    .withMessage("Post vote options is required")
                    .isArray()
                    .withMessage("Post vote options must be array")
                    .custom(async (value, { req }) => {
                        if (
                            req.body.post_vote_options &&
                            req.body.post_vote_options.length > 0
                        ) {
                            if (req.body.post_vote_options.length <= 1) {
                                throw new Error("Post vote mins has 2 option");
                            }

                            req.body.post_vote_options.forEach((res) => {
                                if (
                                    !(
                                        Object.keys(res).includes("name") &&
                                        Object.keys(res).includes("image")
                                    )
                                ) {
                                    throw new Error("Post option need name and image key");
                                }

                                if (!res.name) {
                                    throw new Error("Post option name cannot be empty");
                                }
                            });
                            return true;
                        }
                    }),
            ]

            break;
        }

        case 'votePostOption': {
            return [
                body('vote_option_id', 'Pilihan harus diisi').notEmpty(),
            ]
            
            break;
        }

        default: {
            return [];
        }
    }
}