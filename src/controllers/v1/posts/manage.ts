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

export const posts = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { type, slug } = req.params;

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

    const permission = joinedGroup(group, req.user.id);

    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses', [], 'PROCESS_ERROR', 400));
    }

    where = {
        OR: [
            {
                status: 'published'
            },
            {
                status: 'report'
            }
        ],
        question_post_id: null
    };

    switch (type) {
        case 'dashboard': {
            if (req.user && req.user.id !== undefined) {
                const member = await prisma.groupMember.findMany({
                    where: {
                        user_id: req.user.id,
                        status: 'joined'
                    }
                });

                const group_ids = member.map((item: any) => item.group_id).join(',');

                where = {
                    ...where,
                    group_id: {
                        in: group_ids
                    },
                    group: {
                        OR: [
                            {
                                privacy: 'published'
                            },
                            {
                                privacy: 'restricted'
                            }
                        ]
                    },
                }
            } else {
                where = {
                    ...where,
                    group: {
                        OR: [
                            {
                                privacy: 'published'
                            },
                            {
                                privacy: 'restricted'
                            }
                        ]
                    },
                };
            }
            break;
        }

        case 'community': {
            const group = await prisma.group.findFirst({
                where: {
                    slug: slug
                }
            })

            if (!group) {
                return next(new sendError('Komunitas tidak ditemukan', [], 'NOT_FOUND', 404));
            }

            const isMember = joinedGroup(group, req.user.id);

            if (!isMember) {
                return next(new sendError('Anda belum bergabung', [], 'PROCESS_ERROR', 400));
            }

            where = {
                ...where,
                group_id: group.id
            }

            break;
        }

        case 'profile': {
            const user = await prisma.user.findFirst({
                where: {
                    username: slug
                }
            })

            if (!user) {
                return next(new sendError('User tidak ditemukan', [], 'NOT_FOUND', 404));
            }

            where = {
                ...where,
                user_id: user.id
            }

            break;
        }

        case 'detail': {
            const post = await prisma.post.findFirst({
                where: {
                    slug: slug
                }
            })

            if (!post) {
                return next(new sendError('Post tidak ditemukan', [], 'NOT_FOUND', 404));
            }

            const group = await prisma.group.findFirst({
                where: {
                    id: post.group_id
                }
            })

            if (!group) {
                return next(new sendError('Komunitas tidak ditemukan', [], 'NOT_FOUND', 404));
            }

            if (group.privacy === 'private') {
                const isMember = joinedGroup(group, req.user.id);

                if (!isMember) {
                    return next(new sendError('Anda belum bergabung', [], 'PROCESS_ERROR', 400));
                }
            }

            where = {
                ...where,
                id: post.id
            }

            break;
        }

        case 'answer': {
            delete where.question_post_id;

            const post = await prisma.post.findFirst({
                where: {
                    slug: slug
                }
            })

            if (!post) {
                return next(new sendError('Post tidak ditemukan', [], 'NOT_FOUND', 404));
            }

            const group = await prisma.group.findFirst({
                where: {
                    id: post.group_id
                }
            })

            if (!group) {
                return next(new sendError('Komunitas tidak ditemukan', [], 'NOT_FOUND', 404));
            }

            if (group.privacy === 'private') {
                const isMember = joinedGroup(group, req.user.id);

                if (!isMember) {
                    return next(new sendError('Anda belum bergabung', [], 'PROCESS_ERROR', 400));
                }
            }

            where = {
                ...where,
            }

            break;
        }

        default: {
            return next(new sendError('Tipe tidak ditemukan', [], 'NOT_FOUND', 404));
        }
    }

    let post: any;
    if (type !== 'detail') {
        post = await prisma.post.findMany({
            where: where,
            orderBy: orderBy,
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
            take: limit,
            skip: (page - 1) * limit,
        });

        await Promise.all(post.map(async (posts: any) => {
            convertResPost(posts);
        }))

        const total = await prisma.post.count({
            where: where,
        })

        return res.status(200).json(new sendResponse(post, 'Berhasil mengambil data', pagination(page, limit, total), 200));
    } else {
        post = await prisma.post.findFirst({
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
                    },
                },
                post_comments: true,
                post_upvotes: true,
                post_downvotes: true,
                post_vote_options: true,
            },
        });

        if (!post) {
            return next(new sendError('Post tidak ditemukan', [], 'NOT_FOUND', 404));
        }

        convertResPost(post);

        return res.status(200).json(new sendResponse(post, 'Berhasil mengambil postingan', {}, 200));
    }
})

export const createPost = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    let paragraph: any, body_to_json: any, post_slug: any, random_slug: string, post: any, url: string;

    let {
        post_title,
        post_group_id,
        post_body,
        post_content_type,
        post_attachments,
        post_question_id,
    } = req.body;

    const group = await prisma.group.findUnique({
        where: {
            id: post_group_id
        }
    });

    if (!group) {
        return next(new sendError('Group tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const isMember = joinedGroup(group, req.user.id);

    if (!isMember) {
        return next(new sendError('Anda tidak memiliki akses', [], 'PROCESS_ERROR', 400));
    }

    const post_status = group.privacy === 'public' ? 'published' : 'pending';

    if (post_body) {
        body_to_json = parse(post_body);
        paragraph = body_to_json.filter((item: any) => item.tagName === 'p');

        if (paragraph.length < 1) {
            return next(new sendError('Paragraph tidak boleh kosong', [], 'VALIDATION_ERROR', 422));
        }
    }

    if (post_content_type === 'answer_question' && post_question_id) {
        random_slug = Randomstring.generate(20);
        while (await prisma.post.findFirst({
            where: {
                slug: random_slug
            }
        })) {
            random_slug = Randomstring.generate(20);
        }
    } else {
        random_slug = post_title.toLowerCase().replace(/[^\w ]/g, "").replace(/\s+/g, "-");
        let i = 1;
        while (await prisma.post.findFirst({
            where: {
                slug: random_slug
            }
        })) {
            random_slug = post_title.toLowerCase().replace(/[^\w ]/g, "").replace(/\s+/g, "-") + '-' + i;
            i++;
        }
    }

    if (post_content_type === 'post' || post_content_type === 'question') {
        const search_figure = body_to_json?.filter((item: any) => item.tagName === 'figure');
        const search_img = search_figure?.filter((item: any) => item.children[0].tagName === 'img');

        if (typeof search_img !== 'undefined' && search_img.length > 0 && post_attachments === null) {
            post_attachments = search_img.map((item: any) => item.children[0].attributes[0].value);
        }
    }

    post_slug = random_slug;

    try {
        await prisma.$transaction(async (prisma) => {
            post = await prisma.post.create({
                data: {
                    title: post_title,
                    slug: post_slug,
                    body: post_body,
                    content_type: post_content_type,
                    attachments: post_attachments,
                    group_id: post_group_id,
                    question_post_id: post_question_id ? post_question_id : null,
                    user_id: req.user.id,
                    seo_title: post_title,
                    seo_description: paragraph[0].children[0].content,
                    status: post_status,
                }
            })

            // span attributes value hastag
            const search_class_hastag = body_to_json?.filter((item: any) => item.tagName === 'span' && item.attributes[0].value === 'hastag');

            if (typeof search_class_hastag !== 'undefined' && search_class_hastag.length > 0) {
                await Promise.all(search_class_hastag.map(async (item: any) => {
                    let cek_tag = await prisma.tag.findFirst({
                        where: {
                            name: item.children[0].content
                        }
                    })

                    if (!cek_tag) {
                        cek_tag = await prisma.tag.create({
                            data: {
                                name: item.children[0].content,
                                slug: item.children[0].content.toLowerCase().replace(/[^\w ]/g, "").replace(/\s+/g, "-"),
                            }
                        })
                    }

                    await prisma.postTag.create({
                        data: {
                            post_id: post.id,
                            tag_id: cek_tag.id,
                            tag_name: cek_tag.name,
                        }
                    })
                }))
            }
        })

        let posts: any = await prisma.post.findFirst({
            where: {
                id: post.id
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
                    },
                },
                post_comments: true,
                post_upvotes: true,
                post_downvotes: true,
                post_vote_options: true,
            },
        })

        if (post_content_type === 'answer_question') {
            const post_before: any = await prisma.post.findFirst({
                where: {
                    id: post_question_id
                },
            })

            url = '/' + post.group.slug + '/' + post_before.slug + '/' + post.slug;
        } else {
            url = '/' + post.group.slug + '/' + post.slug;
        }

        posts.url = url;
        posts.created_at_formatted = moment(posts.created_at).fromNow();
        posts.updated_at_formatted = moment(posts.updated_at).fromNow();
        posts.post_comments_count = posts.post_comments.length;
        posts.post_upvotes_count = posts.post_upvotes.length;
        posts.post_downvotes_count = posts.post_downvotes.length;
        posts.post_vote_options_count = posts.post_vote_options.length;
        posts.is_downvote = false;
        posts.is_upvote = false;

        return res.status(200).json(new sendResponse(posts, 'Berhasil membuat postingan', {}, 200));
    } catch (error) {
        return next(new sendError('Gagal membuat post', [], 'PROCESS_ERROR', 400));
    }
})

export const updatePost = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { slug } = req.params;

    const post: any = await prisma.post.findFirst({
        where: {
            slug: slug,
            user_id: req.user.id
        }
    })

    if (!post) {
        return next(new sendError('Post tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    if (post.post_content_type === 'voting') {
        return next(new sendError('Post voting tidak bisa diubah', [], 'PROCESS_ERROR', 400));
    }

    let {
        post_title,
        post_body,
        post_attachments,
    } = req.body;

    let paragraph: any, body_to_json: any, search_img: any;

    if (post_body) {
        body_to_json = parse(req.body.post_body);

        paragraph = body_to_json.filter((item: any) => item.tagName === 'p');

        search_img = body_to_json.filter((item: any) => item.tagName === 'img');

        post_attachments = search_img.map((item: any) => item.attributes[0].value);
    }

    try {
        await prisma.post.update({
            where: {
                id: post.id
            },
            data: {
                title: post_title,
                body: post_body,
                attachments: post_attachments,
                seo_title: post_title,
                seo_description: paragraph[0].children[0].content,
            }
        })

        let posts: any = await prisma.post.findFirst({
            where: {
                id: post.id
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
                    },
                },
                post_comments: true,
                post_upvotes: true,
                post_downvotes: true,
                post_vote_options: true,
            },
        })

        posts.created_at_formatted = moment(posts.created_at).fromNow();
        posts.updated_at_formatted = moment(posts.updated_at).fromNow();
        posts.post_comments_count = posts.post_comments.length;
        posts.post_upvotes_count = posts.post_upvotes.length;
        posts.post_downvotes_count = posts.post_downvotes.length;
        posts.post_vote_options_count = posts.post_vote_options.length;
        posts.is_downvote = false;
        posts.is_upvote = false;

        return res.status(200).json(new sendResponse(posts, 'Berhasil mengubah postingan', {}, 200));
    } catch (error) {
        return next(new sendError('Gagal mengubah post', [], 'PROCESS_ERROR', 400));
    }
})

export const deletePost = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { slug } = req.params;

    const post: any = await prisma.post.findFirst({
        where: {
            slug: slug,
            user_id: req.user.id
        }
    })

    if (!post) {
        return next(new sendError('Post tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    try {
        await prisma.post.delete({
            where: {
                id: post.id
            }
        })

        return res.status(200).json(new sendResponse({}, 'Berhasil menghapus postingan', {}, 200));
    } catch (error) {
        return next(new sendError('Gagal menghapus post', [], 'PROCESS_ERROR', 400));
    }
})

export const validation = (method: string) => {
    switch (method) {
        case 'createPost': {
            return [
                body("post_body").custom(async (value, { req }) => {
                    if (req.body.post_content_type == "shortvideo" && !value) {
                        return true;
                    }

                    if (value) {
                        let body_to_json = parse(req.body.post_body);

                        let search_first_paragraph = body_to_json.find(
                            (res) => res.type == "element" && res.tagName == "p"
                        );

                        if (!search_first_paragraph) {
                            throw new Error("You need at least 1 paragraph");
                        }

                        return true;
                    }
                }),
                body("post_group_id").notEmpty().withMessage("Group id is required"),
                body("post_content_type")
                    .notEmpty()
                    .withMessage("Post type content is required")
                    .isIn(["post", "question", "video", "shortvideo", "answer_question"])
                    .withMessage("Please insert post type"),
                body("post_title")
                    .custom(async (value, { req }) => {
                        if (req.body.post_content_type != "answer_question") {
                            if (!value) {
                                throw new Error("Title is required");
                            }
                        }

                        return true;
                    })
                    .isLength({ max: 255 })
                    .withMessage("Post title is too long"),
                body("post_attachments").custom(async (value, { req }) => {
                    if (
                        req.body.post_content_type == "video" ||
                        req.body.post_content_type == "shortvideo"
                    ) {
                        if (!value) {
                            throw new Error("Post attachments is required");
                        }
                    }
                    return true;
                }),
                body("post_question_post_id").custom(async (value, { req }) => {
                    if (req.body.post_content_type == "answer_question") {
                        if (!value) {
                            throw new Error("Post question id is required");
                        }
                    }

                    return true;
                }),
            ]
            break;
        }

        case 'updatePost': {
            return [
                body("post_body").custom(async (value, { req }) => {
                    if (req.body.post_content_type == "shortvideo" && !value) {
                        return true;
                    }

                    if (value) {
                        let body_to_json = parse(req.body.post_body);

                        let search_first_paragraph = body_to_json.find(
                            (res) => res.type == "element" && res.tagName == "p"
                        );

                        if (!search_first_paragraph) {
                            throw new Error("You need at least 1 paragraph");
                        }

                        return true;
                    }
                }),

                body("post_title").optional().isLength({ max: 255 }).withMessage("Post title is too long"),
                body("post_attachments").optional(),

            ]
            break;
        }

        default: {
            return []
        }
    }
}