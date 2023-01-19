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

export const tags = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
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

    if (search) {
        where = {
            OR: [
                {
                    name: {
                        contains: search
                    }
                },
                {
                    slug: {
                        contains: search.toLowerCase()
                    }
                }
            ]
        }
    }

    const tags = await prisma.tag.findMany({
        where: where,
        include: {
            post_tags: true
        },
        orderBy: orderBy.length > 0 ? orderBy : [
            {
                created_at: order
            }
        ],
        take: limit,
        skip: (page - 1) * limit
    });

    await Promise.all(tags.map(async (tag: any) => {
        tag.post_tag_count = tag.post_tags.length;
        delete tag.post_tags;
    }))

    const total = await prisma.tag.count({
        where: where
    });

    return res.json(new sendResponse(tags, 'Berhasil mengambil data', pagination(page, limit, total), 200));
});

export const createTag = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const {
        name,
        post_id
    } = req.body;

    const 
        tag_name = name;

    const post = await prisma.post.findFirst({
        where: {
            id: post_id,
        }
    })

    if (!post) {
        return next(new sendError('Post tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    let tag = await prisma.tag.findFirst({
        where: {
            name: tag_name
        }
    })

    if (!tag) {
        let slug = tag_name.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "");
        let i = 1;
        while (await prisma.tag.findFirst({ where: { slug: slug } })) {
            slug = tag_name.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "") + '-' + i;
            i++;
        }

        tag = await prisma.tag.create({
            data: {
                name: tag_name,
                slug: slug
            }
        })
    }

    const post_tag = await prisma.postTag.create({
        data: {
            post_id: post_id,
            tag_id: tag.id,
            tag_name: tag_name,
        }
    })

    return res.json(new sendResponse(post_tag, 'Berhasil membuat tag', {}, 200));
});

export const listPostByTag = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const {
        tag_slug
    } = req.query;

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

    where = {
        status: 'published',
    }

    if (req.user) {
        where = {
            ...where,
            OR: [
                {
                    group: {
                        privacy: 'public'
                    }
                },
                {
                    group: {
                        privacy: 'private',
                        group_members: {
                            some: {
                                user_id: req.user.id
                            }
                        }
                    },
                },
                {
                    group: {
                        privacy: 'hidden',
                        group_members: {
                            some: {
                                user_id: req.user.id
                            }
                        }
                    },
                },
            ]
        }
    } else {
        where = {
            ...where,
            group: {
                privacy: 'public'
            }
        }
    }

    if (tag_slug) {
        where = {
            ...where,
            post_tags: {
                some: {
                    tag: {
                        slug: tag_slug
                    }
                }
            }
        }
    }

    const posts = await prisma.post.findMany({
        where: where,
        include: {
            post_tags: true,
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
        take: limit,
        skip: (page - 1) * limit
    })

    await Promise.all(posts.map(async (post: any) => {
        await convertResPost(post, req.user?.id);
    }))

    const total = await prisma.post.count({
        where: where
    });

    return res.json(new sendResponse(posts, 'Berhasil mengambil data', pagination(page, limit, total), 200));
})

export const validation = (method: string) => {
    switch (method) {
        case 'createTag': {
            return [
                body('name').notEmpty().withMessage('Nama tag tidak boleh kosong'),
                body('post_id').notEmpty().withMessage('Post ID tidak boleh kosong'),
            ]
            break;
        }

        default: {
            return [];
        }
    }
}