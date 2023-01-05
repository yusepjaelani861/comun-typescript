import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import asyncHandler from "../../../middleware/async";
import { sendError, sendResponse } from "../../../libraries/rest";
import { body, validationResult } from "express-validator";
import { createMemberPermission, createRolePermission, joinedGroup, list_permission_roles, myPermissionGroup } from "./helper";
import { pagination } from "../../../libraries/helper";

const prisma = new PrismaClient();

export const settings = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { slug } = req.params;

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const permission = await myPermissionGroup(group, req.user.id, 'pengaturan');
    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses', [], 'PROCESS_ERROR', 400));
    }

    const groupPermission = await prisma.groupPermission.findMany({
        where: {
            group_id: group.id
        }
    })

    const label = ['Anggota', 'Postingan'];
    const data: any = [];
    await Promise.all(groupPermission.map(async (item: any) => {
        if (item.slug === 'persetujuan_bergabung' || item.slug === 'formulir_saat_bergabung') {
            data[0] = {
                label: label[0],
                children: []
            }
            data[0].children.push(item)
        }
        
        if (item.slug === 'persetujuan_posting') {
            data[1] = {
                label: label[1],
                children: []
            }
            data[1].children.push(item)
        }
    }))

    res.status(200).json(new sendResponse(data, 'Berhasil mengambil data', {}, 200));
})

export const settingPrivacy = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { slug } = req.params;

    const {
        privacy
    } = req.body;

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const permission = myPermissionGroup(group, req.user.id, 'pengaturan');
    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses', [], 'PROCESS_ERROR', 400));
    }

    try {
        await prisma.$transaction(async (prisma) => {
            await prisma.group.update({
                where: {
                    id: group.id
                },
                data: {
                    privacy: privacy
                }
            })
        })
        res.json(new sendResponse([], 'Berhasil mengubah privasi', [], 200))
    } catch (error) {
        return next(new sendError('Gagal mengubah privasi', [], 'PROCESS_ERROR', 400));
    }
})

export const togglePermission = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { slug_group } = req.params;

    const {
        slug,
    } = req.body;

    const group = await prisma.group.findFirst({
        where: {
            slug: slug_group
        }
    })

    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const permission = myPermissionGroup(group, req.user.id, 'pengaturan');
    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses', [], 'PROCESS_ERROR', 400));
    }

    const group_permission = await prisma.groupPermission.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group_permission) {
        return next(new sendError('Permission tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    if (group_permission.slug === 'formulir_saat_bergabung' && group_permission.status === false) {
        const cek = await prisma.groupPermission.findFirst({
            where: {
                slug: 'persetujuan_bergabung',
                status: true,
            }
        })
        if (!cek) {
            return next(new sendError('Anda harus mengaktifkan persetujuan bergabung', [], 'PROCESS_ERROR', 400));
        }
    }

    try {
        await prisma.$transaction(async (prisma) => {
            await prisma.groupPermission.update({
                where: {
                    id: group_permission.id
                },
                data: {
                    status: !group_permission.status
                }
            })
        })
        res.json(new sendResponse([], 'Berhasil mengubah permission', [], 200))
    } catch (error) {
        return next(new sendError('Gagal mengubah permission', [], 'PROCESS_ERROR', 400));
    }
})

export const addFormulir = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { slug_group } = req.params;

    const {
        name,
    } = req.body;

    const group = await prisma.group.findFirst({
        where: {
            slug: slug_group
        }
    })

    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const permission = myPermissionGroup(group, req.user?.id, 'pengaturan');
    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses', [], 'PROCESS_ERROR', 400));
    }

    const group_permission = await prisma.groupPermission.findFirst({
        where: {
            slug: 'formulir_saat_bergabung',
            status: true
        }
    })

    if (!group_permission) {
        return next(new sendError('Izin formulir nonaktif', [], 'PROCESS_ERROR', 400));
    }

    try {
        await prisma.$transaction(async (prisma) => {
            await prisma.groupForm.create({
                data: {
                    name: name,
                    group_id: group.id,
                }
            })
        })
        res.json(new sendResponse([], 'Berhasil menambah formulir', [], 200))
    } catch (error) {
        return next(new sendError('Gagal menambah formulir', [], 'PROCESS_ERROR', 400));
    }
})

export const deleteFormulir = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { slug_group, id } = req.params;

    const group = await prisma.group.findFirst({
        where: {
            slug: slug_group
        }
    })

    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const permission = myPermissionGroup(group, req.user?.id, 'pengaturan');
    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses', [], 'PROCESS_ERROR', 400));
    }

    const group_permission = await prisma.groupPermission.findFirst({
        where: {
            slug: 'formulir_saat_bergabung'
        }
    })

    if (!group_permission) {
        return next(new sendError('Permission tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const group_form = await prisma.groupForm.findFirst({
        where: {
            id: parseInt(id)
        }
    })

    if (!group_form) {
        return next(new sendError('Formulir tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    try {
        await prisma.$transaction(async (prisma) => {
            await prisma.groupForm.delete({
                where: {
                    id: parseInt(id)
                }
            })
        })
        return next(new sendResponse([], 'Berhasil menghapus formulir', [], 200));
    } catch (error) {
        return next(new sendError('Gagal menghapus formulir', [], 'PROCESS_ERROR', 400));
    }
}) 

export const listFormulir = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { slug } = req.params;
    
    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const groupPermission = await prisma.groupPermission.findFirst({
        where: {
            slug: 'formulir_saat_bergabung',
            status: true
        }
    })

    if (!groupPermission) {
        return next(new sendError('Pengaturan formulir untuk bergabung tidak aktif', [], 'PROCESS_ERROR', 400));
    }

    const forms = await prisma.groupForm.findMany({
        where: {
            group_id: group.id
        }
    })

    res.json(new sendResponse(forms, 'Berhasil mengambil formulir', [], 200))
})

export const validation = (method: string) => {
    switch (method) {
        case 'settingPrivacy': {
            return [
                body('privacy').notEmpty().withMessage('Privacy tidak boleh kosong').isIn(['public', 'private', 'restricted']).withMessage('Privacy tidak valid'),
            ]
        }

        case 'addFormulir': {
            return [
                body('name').notEmpty().withMessage('Nama tidak boleh kosong').isString().withMessage('Nama harus berupa string'),
            ]
        }

        case 'togglePermission': {
            return [
                body('slug').notEmpty().withMessage('Slug tidak boleh kosong').isString().withMessage('Slug harus berupa string'),
            ]
            break;
        }

        default: {
            return []
        }
    }
}