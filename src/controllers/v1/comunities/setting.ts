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

    res.status(200).json(new sendResponse(groupPermission, 'Berhasil mengambil data', {}, 200));
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
            group_id: group.id,
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

    if (group_permission.slug === 'persetujuan_bergabung' && group_permission.status === true) {
        const cek = await prisma.groupPermission.findFirst({
            where: {
                slug: 'formulir_saat_bergabung',
                status: true,
            }
        })
        if (cek) {
            await prisma.groupPermission.update({
                where: {
                    id: cek.id
                },
                data: {
                    status: false
                }
            })
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
            const form = await prisma.groupForm.create({
                data: {
                    group_id: group.id,
                }
            })
            res.json(new sendResponse(form, 'Berhasil menambah formulir', [], 200))
        })
    } catch (error) {
        return next(new sendError('Gagal menambah formulir', [], 'PROCESS_ERROR', 400));
    }
})

export const updateFormulir = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { slug } = req.params;
    const {
        id,
        name,
    } = req.body;

    if (!slug) {
        return next(new sendError('Slug tidak boleh kosong', [], 'PROCESS_ERROR', 400));
    }

    const group: any = await prisma.group.findFirst({
        where: {
            slug: slug
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

    const form = await prisma.groupForm.update({
        where: {
            id: id
        },
        data: {
            name: name
        }
    })
    res.json(new sendResponse(form, 'Berhasil mengubah formulir', [], 200))
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
        res.json(new sendResponse([], 'Berhasil menghapus formulir', [], 200));
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

    // const groupPermission = await prisma.groupPermission.findFirst({
    //     where: {
    //         slug: 'formulir_saat_bergabung',
    //         status: true
    //     }
    // })

    // if (!groupPermission) {
    //     return next(new sendError('Pengaturan formulir untuk bergabung tidak aktif', [], 'PROCESS_ERROR', 400));
    // }

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
                //
            ]
        }

        case 'togglePermission': {
            return [
                body('slug').notEmpty().withMessage('Slug tidak boleh kosong').isString().withMessage('Slug harus berupa string'),
            ]
            break;
        }

        case 'updateFormulir': {
            return [
                body('id').notEmpty().withMessage('ID tidak boleh kosong').isInt().withMessage('ID harus berupa angka'),
                body('name').notEmpty().withMessage('Nama tidak boleh kosong').isString().withMessage('Nama harus berupa string'),
            ]
            break;
        }

        default: {
            return []
        }
    }
}