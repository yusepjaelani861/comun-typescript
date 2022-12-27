import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import asyncHandler from "../../../middleware/async";
import { sendError, sendResponse } from "../../../libraries/rest";
import { body, validationResult } from "express-validator";
import { createMemberPermission, createRolePermission, joinedGroup, myPermissionGroup } from "./helper";
import { pagination } from "../../../libraries/helper";

const prisma = new PrismaClient();

export const createComunity = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const {
        name,
        slug,
        tagline,
        avatar,
        background,
        color,
        privacy,
    } = req.body;

    const 
        group_name = name,
        group_slug = slug,
        group_tagline = tagline,
        group_avatar = avatar,
        group_background = background,
        group_color = color,
        group_privacy = privacy;

    const { id } = req.user;

    const comunity = await prisma.group.create({
        data: {
            name: group_name,
            slug: group_slug,
            tagline: group_tagline,
            avatar: group_avatar ? group_avatar : `https://ui-avatars.com/api/?name=${group_name}&background=0D8ABC&color=fff&size=128`,
            background: group_background,
            color: group_color,
            privacy: group_privacy,
        }
    })

    const owner = await prisma.groupRole.create({
        data: {
            group_id: comunity.id,
            name: 'Owner',
            slug: 'owner',
            description: 'Owner of the group',
        }
    })

    const group_member = await prisma.groupMember.create({
        data: {
            group_id: comunity.id,
            user_id: id,
            group_role_id: owner.id,
            status: 'joined',
        }
    })

    createRolePermission(comunity, owner);

    return res.status(200).json(new sendResponse(comunity, 'Comunity created', {}, 200));
})

export const joinComunity = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { slug } = req.params;

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan!', [], 'NOT_FOUND', 404));
    }

    const group_member = await prisma.groupMember.findFirst({
        where: {
            group_id: group.id,
            user_id: req.user.id,
        }
    })

    if (group_member) {
        return next(new sendError('Anda sudah bergabung dengan komunitas ini!', [], 'PROCESS_ERROR', 400));
    }

    let role: any;
    role = await prisma.groupRole.findFirst({
        where: {
            group_id: group.id,
            slug: 'anggota',
        }
    })

    if (!role) {
        role = await prisma.groupRole.create({
            data: {
                group_id: group.id,
                name: 'Anggota',
                slug: 'anggota',
                description: 'Member of the group',
            }
        })

        createMemberPermission(role);
    }

    let message: string, status: string, data: any;
    data = {
        group_id: group.id,
        user_id: req.user.id,
        group_role_id: role.id,
    }
    switch (group.privacy) {
        case 'public': {
            message = 'Berhasil bergabung dengan komunitas!';
            status = 'joined';
            data.status = status;
            break;
        }
        case 'private': {
            message = 'Permintaan bergabung telah dikirim!';
            status = 'pending';
            data.status = status;
            break;
        }
        case 'restricted': {
            message = 'Permintaan bergabung telah dikirim!';
            status = 'pending';
            data.status = status;
            break;
        }
        default: {
            return next(new sendError('Terjadi kesalahan di sisi user!', [], 'PROCESS_ERROR', 400));
        }
    }

    const member = await prisma.groupMember.create({
        data: data
    })

    return res.status(200).json(new sendResponse(member, message, {}, 200));
})

export const exitComunity = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { slug } = req.params;

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan!', [], 'NOT_FOUND', 404));
    }

    const group_member = await prisma.groupMember.findFirst({
        where: {
            group_id: group.id,
            user_id: req.user.id,
        }
    })

    if (!group_member) {
        return next(new sendError('Anda belum bergabung dengan komunitas ini!', [], 'PROCESS_ERROR', 400));
    }

    const owner: any = await prisma.groupRole.findFirst({
        where: {
            group_id: group.id,
            slug: 'owner',
        }
    })

    if (owner.id === group_member.group_role_id) {
        return next(new sendError('Owner tidak dapat keluar dari komunitas ini!', [], 'PROCESS_ERROR', 400));
    }

    const member = await prisma.groupMember.delete({
        where: {
            id: group_member.id
        }
    })

    return res.status(200).json(new sendResponse({}, 'Anda berhasil keluar dari komunitas!', {}, 200));
})

export const listComunity = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    try {
        const comunity = await prisma.group.findMany({
            skip: (page - 1) * limit,
            take: limit,
            orderBy: {
                id: 'desc'
            },
            where: {
                group_members: {
                    every: {
                        status: 'joined',
                        user_id: req.user.id,
                    }
                }
            },
            include: {
                group_posts: true,
                group_members: true,
            }
        })

        await Promise.all(comunity.map(async (item: any) => {
            item.total_member = item.group_members.length;
            item.total_post = item.group_posts.length;
            item.is_member = item.group_members.some((member: any) => member.user_id === req.user.id);
            delete item.group_members;
            delete item.group_posts;
        }));

        const total_comunity = await prisma.group.count({
            where: {
                group_members: {
                    every: {
                        status: 'joined',
                        user_id: req.user.id,
                    }
                }
            }
        })

        const paginate = pagination(page, limit, total_comunity);

        return res.status(200).json(new sendResponse(comunity, 'List of comunity', paginate, 200));
    } catch (error: any) {
        return next(new sendError('Terjadi kesalahan di sisi user!', error.stack, 'PROCESS_ERROR', 400));
    }
})

export const listMemberComunity = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { slug } = req.params;
    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    });

    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan!', [], 'NOT_FOUND', 404));
    }

    const is_joined = joinedGroup(group, req.user.id)
    if (!is_joined) {
        return next(new sendError('Anda belum bergabung dengan komunitas ini!', [], 'PROCESS_ERROR', 400));
    }

    const group_member = await prisma.groupMember.findMany({
        where: {
            group_id: group.id,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
            id: 'desc'
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
            group_role: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                }
            },
            group: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    avatar: true,
                }
            }
        }
    })

    const group_role = await prisma.groupRole.findMany({
        where: {
            group_id: group.id,
        }
    })

    let role: any = [];
    await Promise.all(group_role.map(async (item: any) => {
        role.push(item.name);
    }));

    let collection: any = [];
    await Promise.all(role.map(async (item: any) => {
        let member: any = [];
        await Promise.all(group_member.map(async (member_item: any) => {
            if (member_item.group_role.name === item) {
                member.push(member_item);
            }
        }));

        collection.push({
            role_name: item,
            member: member
        });
    }));


    const total_group_member = await prisma.groupMember.count({
        where: {
            group_id: group.id,
        }
    })

    return res.status(200).json(new sendResponse(collection, 'List of member', pagination(page, limit, total_group_member), 200));
})

export const listAllMember = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { slug } = req.params;
    let { page = 1, limit = 10, search, role, order = 'desc' } = req.query;
    let group_member: any, total_group_member: number = 0, where: any = {};

    page = parseInt(page);
    limit = parseInt(limit);

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    });

    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan!', [], 'NOT_FOUND', 404));
    }

    const is_joined = joinedGroup(group, req.user.id)
    if (!is_joined) {
        return next(new sendError('Anda belum bergabung dengan komunitas ini!', [], 'PROCESS_ERROR', 400));
    }

    where = {
        group_id: group.id,
    };

    if (role) {
        const permission = myPermissionGroup(group, req.user.id, 'kelola_roles');

        if (!permission) {
            return next(new sendError('Anda tidak memiliki akses untuk melihat anggota dengan role ini!', [], 'PROCESS_ERROR', 400));
        }
        
        where.group_role = {
            slug: role.toLowerCase()
        }
    }

    if (search) {
        where.user = {
            OR: [
                { name: { contains: search } },
                { username: { contains: search.toLowerCase() } },
            ]
        }
    }

    group_member = await prisma.groupMember.findMany({
        where: where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
            id: order,
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
            group_role: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                }
            },
            group: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    avatar: true,
                }
            }
        }
    })

    total_group_member = await prisma.groupMember.count({
        where: where,
    })

    return res.status(200).json(new sendResponse(group_member, 'List of member', pagination(page, limit, total_group_member), 200));
})

export const validation = (method: string) => {
    switch (method) {
        case 'createComunity': {
            return [
                body('name').notEmpty().withMessage('Nama komunitas tidak boleh kosong!'),
                body('slug').notEmpty().withMessage('Slug komunitas tidak boleh kosong!'),
                body('tagline').notEmpty().withMessage('Tagline komunitas tidak boleh kosong!'),
                body('avatar').optional(),
                body('background').notEmpty().withMessage('Background komunitas tidak boleh kosong!'),
                body('color').notEmpty().withMessage('Warna komunitas tidak boleh kosong!'),
                body('privacy').notEmpty().withMessage('Tipe komunitas tidak boleh kosong!'),
            ]
            break;
        }

        default: {
            return [];
        }
    }
}