import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import asyncHandler from "../../../middleware/async";
import { sendError, sendResponse } from "../../../libraries/rest";
import { body, validationResult } from "express-validator";
import { createGroupPermission, createMemberPermission, createRolePermission, joinedGroup, myPermissionGroup } from "./helper";
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

    const group = await prisma.group.findFirst({
        where: {
            slug: group_slug
        }
    })

    if (group) {
        return next(new sendError('Komunitas sudah ada', [], 'PROCESS_ERROR', 400));
    }

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

    await createRolePermission(comunity, owner);
    await createGroupPermission(comunity.id)

    await prisma.groupDompet.create({
        data: {
            group_id: comunity.id,
        }
    })

    return res.status(200).json(new sendResponse(comunity, 'Comunity created', {}, 200));
})

export const joinComunity = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { slug } = req.params;
    const {
        answer,
    } = req.body;

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

    let message: string, status: string, data: any, member: any;
    data = {
        group_id: group.id,
        user_id: req.user.id,
        group_role_id: role.id,
    }

    message = 'Berhasil bergabung dengan komunitas!';
    status = 'joined';
    data.status = status;

    const permissionGroup = await prisma.groupPermission.findMany({
        where: {
            group_id: group.id,
        }
    })

    const persetujuanBergabung = permissionGroup.find((item: any) => item.slug === 'persetujuan_bergabung');

    if (persetujuanBergabung && persetujuanBergabung.status === true) {
        message = 'Permintaan bergabung telah dikirim!';
        status = 'pending';
        data.status = status;
    }

    const formulirBergabung = permissionGroup.find((item: any) => item.slug === 'formulir_saat_bergabung');
    if (formulirBergabung && formulirBergabung.status === true) {
        const form = await prisma.groupForm.findMany()
        if (form.length > 0) {
            if (!answer || answer.length < form.length) {
                return next(new sendError('Jawaban formulir belum lengkap!', [
                    {
                        id: 'id',
                        message: 'id tidak boleh kosong'
                    },
                    {
                        id: 'value',
                        message: 'value tidak boleh kosong'
                    }
                ], 'PROCESS_ERROR', 400));
            }

            if (!Array.isArray(answer)) {
                return next(new sendError('Jawaban formulir harus berupa array!', [
                    {
                        id: 'id',
                        message: 'id tidak boleh kosong'
                    },
                    {
                        id: 'value',
                        message: 'value tidak boleh kosong'
                    }
                ], 'PROCESS_ERROR', 400));
            }

            if (answer.find((item: any) => !item.id || !item.value)) {
                return next(new sendError('Jawaban formulir tidak lengkap!', [
                    {
                        id: 'id',
                        message: 'id tidak boleh kosong'
                    },
                    {
                        id: 'value',
                        message: 'value tidak boleh kosong'
                    }
                ], 'PROCESS_ERROR', 400));
            }

            member = await prisma.groupMember.create({
                data: data
            })

            await Promise.all(answer.map(async (item: any) => {
                await prisma.groupMemberForm.create({
                    data: {
                        group_member_id: member.id,
                        group_form_id: item.id,
                        value: item.value,
                    }
                })
            }))
        }
    } else {
        member = await prisma.groupMember.create({
            data: data
        })
    }

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
        const member = await prisma.groupMember.findMany({
            where: {
                user_id: req.user.id,
                status: 'joined',
            },
            include: {
                group: {
                    include: {
                        group_posts: true,
                        group_members: true,
                    }
                }
            },
            skip: (page - 1) * limit,
            take: limit,
            orderBy: {
                id: 'desc'
            }
        })
        // const comunity = await prisma.group.findMany({
        //     where: {
        //         group_members: {
        //             every: {
        //                 status: 'joined',
        //                 user_id: req.user.id,
        //             }
        //         }
        //     },
        //     skip: (page - 1) * limit,
        //     take: limit,
        //     orderBy: {
        //         id: 'desc'
        //     },
        //     include: {
        //         group_posts: true,
        //         group_members: true,
        //     }
        // })

        let comunity: any = [];
        member.forEach((item: any) => {
            comunity.push(item.group);
        })

        await Promise.all(comunity.map(async (item: any) => {
            item.total_member = item.group_members.length;
            item.total_post = item.group_posts.length;
            item.is_member = item.group_members.some((member: any) => member.user_id === req.user.id);
            delete item.group_members;
            delete item.group_posts;
        }));

        const total_comunity = await prisma.groupMember.count({
            where: {
                status: 'joined',
                user_id: req.user.id,
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

export const listAnswerFormJoin = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    let { page = 1, limit = 10, search, order = 'desc' } = req.query;
    const { slug } = req.params;

    page = parseInt(page);
    limit = parseInt(limit);

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan!', [], 'NOT_FOUND', 404));
    }

    const permission = myPermissionGroup(group, req.user?.id, 'terima_dan_tolak_anggota')
    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses untuk melihat daftar permintaan bergabung!', [], 'PROCESS_ERROR', 400));
    }

    const answers = await prisma.groupMemberForm.findMany({
        where: {
            group_member: {
                group_id: group.id,
            },
        },
        include: {
            group_member: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            avatar: true,
                        },
                    },
                },
            },
            group_form: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
            id: order,
        },
    })

    const total_answers = await prisma.groupMemberForm.count({
        where: {
            group_member: {
                group_id: group.id,
            },
        },
    })

    return res.status(200).json(new sendResponse(answers, 'List of answer form join', pagination(page, limit, total_answers), 200));
})

export const validation = (method: string) => {
    switch (method) {
        case 'createComunity': {
            return [
                body('name').notEmpty().withMessage('Nama komunitas tidak boleh kosong!'),
                body('slug').notEmpty().withMessage('Slug komunitas tidak boleh kosong!'),
                // body('tagline').notEmpty().withMessage('Tagline komunitas tidak boleh kosong!'),
                body('avatar').optional(),
                body('background').optional(),
                body('color').optional(),
                body('privacy').notEmpty().withMessage('Tipe komunitas tidak boleh kosong!'),
            ]
            break;
        }

        default: {
            return [];
        }
    }
}