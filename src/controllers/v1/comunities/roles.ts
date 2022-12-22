import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import asyncHandler from "../../../middleware/async";
import { sendError, sendResponse } from "../../../libraries/rest";
import { body, validationResult } from "express-validator";
import { createMemberPermission, createRolePermission, joinedGroup, list_permission_roles, myPermissionGroup } from "./helper";
import { pagination } from "../../../libraries/helper";

const prisma = new PrismaClient();

export const listPermissionRoles = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    return res.status(200).json(new sendResponse(list_permission_roles, 'Berhasil mengambil data', {}, 200));
})

export const createRoles = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { slug } = req.params;
    const { permissions, group_role_name } = req.body;

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const permission = myPermissionGroup(group, req.user.id, 'kelola_roles');

    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses', [], 'PROCESS_ERROR', 400));
    }

    let slug_role = group_role_name.replace(/\s+/g, "-").toLowerCase();
    var i: number = 1;

    while (
        await prisma.groupRole.findFirst({
            where: {
                slug: slug_role
            }
        })
    ) {
        slug_role = slug_role + '-' + i;
        i++;
    }

    try {
        await prisma.$transaction(async (prisma) => {
            const group_role = await prisma.groupRole.create({
                data: {
                    slug: slug_role,
                    name: group_role_name,
                    group_id: group.id,
                    description: group_role_name + ' of the group',
                }
            })

            await Promise.all(list_permission_roles.map(async (item: any) => {
                const izin = permissions.find((permission: any) => permission.slug === item.slug);

                if (izin) {
                    await prisma.groupRolePermission.create({
                        data: {
                            group_role_id: group_role.id,
                            name: item.name,
                            slug: item.slug,
                            description: item.description,
                            label: item.label,
                            status: izin.status
                        }
                    })
                } else {
                    await prisma.groupRolePermission.create({
                        data: {
                            group_role_id: group_role.id,
                            name: item.name,
                            slug: item.slug,
                            description: item.description,
                            label: item.label,
                            status: item.status
                        }
                    })
                }
            }))

            return res.status(200).json(new sendResponse({}, 'Berhasil membuat role baru', {}, 200));
        })
    } catch (error) {
        return next(new sendError('Gagal membuat role baru', [], 'PROCESS_ERROR', 400));
    }
})

export const listRolePerComunity = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { slug } = req.params;
    const { role } = req.query;

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const permission = myPermissionGroup(group, req.user.id, 'kelola_roles');

    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses', [], 'PROCESS_ERROR', 400));
    }

    if (role) {
        const group_role = await prisma.groupRole.findFirst({
            where: {
                slug: role,
                group_id: group.id
            },
            include: {
                group_role_permissions: true,
                group_members: true
            }
        })

        if (!group_role) {
            return next(new sendError('Role tidak ditemukan', [], 'NOT_FOUND', 404));
        }

        const labelList = ["Konten", "Anggota", "Komunitas"];
        const data = labelList.map((label: any) => {
            const data_role = group_role.group_role_permissions.filter((item: any) => item.label === label);

            return {
                label: label,
                children: data_role,
            }
        })

        const results = {
            name: group_role.name,
            slug: group_role.slug,
            total_member: group_role.group_members.length,
            results: data,
        }

        return res.status(200).json(new sendResponse(results, 'Berhasil mengambil data', {}, 200));
    }

    const group_roles = await prisma.groupRole.findMany({
        where: {
            group_id: group.id
        },
        include: {
            group_members: true
        }
    })

    await Promise.all(group_roles.map(async (item: any) => {
        item.total_member = item.group_members.length;
        delete item.group_members;

        return item;
    }));

    return res.status(200).json(new sendResponse(group_roles, 'Berhasil mengambil data', {}, 200));
})

export const changeStatusPermission = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { slug } = req.params;
    const {
        group_role_permission_id,
        group_role_permission_status,
    } = req.body;

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const permission = myPermissionGroup(group, req.user.id, 'kelola_roles');

    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses', [], 'PROCESS_ERROR', 400));
    }

    const myrole = await prisma.groupRole.findFirst({
        where: {
            group_id: group.id,
            group_members: {
                some: {
                    user_id: req.user.id
                }
            }
        }
    })

    if (!myrole) {
        return next(new sendError('Anda tidak dapat mengubah role permission sendiri', [], 'PROCESS_ERROR', 400));
    }

    const group_role_permission = await prisma.groupRolePermission.findFirst({
        where: {
            id: group_role_permission_id,
        },
        include: {
            group_role: true
        }
    })

    if (!group_role_permission) {
        return next(new sendError('Permission tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    if (group_role_permission.group_role.slug === 'owner') {
        return next(new sendError('Permission owner tidak dapat diubah', [], 'PROCESS_ERROR', 400));
    }

    const slug_permission = ['analitik', 'pembayaran', 'navigasi', 'tampilan', 'atur_fitur', 'pengaturan'];

    if (group_role_permission.slug === 'kelola_komunitas' && group_role_permission.status === false) {
        const check = slug_permission.find((item: any) => item === group_role_permission.slug);

        if (check) {
            return next(new sendError('Anda tidak dapat melakukan action ini', [], 'PROCESS_ERROR', 400));
        }
    }

    if (group_role_permission.slug === 'kelola_komunitas') {
        await Promise.all(slug_permission.map(async (item: any) => {
            const permission = await prisma.groupRolePermission.findFirst({
                where: {
                    slug: item,
                    group_role_id: group_role_permission.group_role_id
                }
            })

            if (permission) {
                await prisma.groupRolePermission.update({
                    where: {
                        id: permission.id
                    },
                    data: {
                        status: group_role_permission_status
                    }
                })
            }
        }))
    }

    const update = await prisma.groupRolePermission.update({
        where: {
            id: group_role_permission_id
        },
        data: {
            status: group_role_permission_status
        }
    })

    return res.status(200).json(new sendResponse(update, 'Berhasil mengubah status permission', {}, 200));
})

export const changeRoleMember = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { slug } = req.params;
    const { user_id, group_role_id } = req.body;

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const permission = myPermissionGroup(group, req.user.id, 'kelola_roles');

    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses', [], 'PROCESS_ERROR', 400));
    }

    if (!req.user.id === user_id) {
        return next(new sendError('Anda tidak dapat mengubah role sendiri', [], 'PROCESS_ERROR', 400));
    }

    const user_member = await prisma.groupMember.findFirst({
        where: {
            group_id: group.id,
            user_id: user_id
        },
        include: {
            group_role: true
        }
    })

    if (!user_member) {
        return next(new sendError('Member tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    if (user_member.group_role.slug === 'owner') {
        return next(new sendError('Anda tidak dapat mengubah role owner', [], 'PROCESS_ERROR', 400));
    }

    if (group_role_id === user_member.group_role_id) {
        return next(new sendError('Role member tidak berubah', [], 'PROCESS_ERROR', 400));
    }

    const group_role = await prisma.groupRole.findFirst({
        where: {
            id: group_role_id
        }
    })

    if (!group_role) {
        return next(new sendError('Role tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const update_role = await prisma.groupMember.update({
        where: {
            id: user_member.id
        },
        data: {
            group_role_id: group_role_id
        }
    })

    return res.status(200).json(new sendResponse(update_role, 'Berhasil mengubah role member', {}, 200));
})

export const validation = (method : string) => {
    switch (method) {
        case 'createRoles': {
            return [
                body('permissions').isArray().withMessage('permissions harus berupa array')
                    .notEmpty().withMessage('permissions tidak boleh kosong'),
                body('group_role_name').notEmpty().withMessage('Nama role tidak boleh kosong')
            ]
            break;
        }

        case 'changeStatusPermission': {
            return [
                body('group_role_permission_id').notEmpty().withMessage('group_role_permission_id tidak boleh kosong'),
                body('group_role_permission_status').notEmpty().withMessage('group_role_permission_status tidak boleh kosong')
            ]
            break;
        }

        case 'changeRoleMember': {
            return [
                body('user_id').notEmpty().withMessage('user_id tidak boleh kosong'),
                body('group_role_id').notEmpty().withMessage('group_role_id tidak boleh kosong')
            ]
            break;
        }

        default: {
            return [];
        }
    }
}