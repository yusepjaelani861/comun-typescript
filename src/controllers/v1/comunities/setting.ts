import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import asyncHandler from "../../../middleware/async";
import { sendError, sendResponse } from "../../../libraries/rest";
import { body, validationResult } from "express-validator";
import { createMemberPermission, createRolePermission, joinedGroup, list_permission_roles, myPermissionGroup } from "./helper";
import { pagination } from "../../../libraries/helper";

const prisma = new PrismaClient();

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
        return next(new sendResponse([], 'Berhasil mengubah privasi', [], 200));
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

    try {
        await prisma.$transaction(async (prisma) => {
            if (group_permission.slug === 'persetujuan_bergabung') {
                await prisma.groupPermission.update({
                    where: {
                        slug: 'formulir_saat_bergabung'
                    },
                    data: {
                        status: !group_permission.status
                    }
                })
            }

            await prisma.groupPermission.update({
                where: {
                    id: group_permission.id
                },
                data: {
                    status: !group_permission.status
                }
            })
        })
        return next(new sendResponse([], 'Berhasil mengubah permission', [], 200));
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
            slug: 'formulir_saat_bergabung'
        }
    })

    if (!group_permission) {
        return next(new sendError('Permission tidak ditemukan', [], 'NOT_FOUND', 404));
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
        return next(new sendResponse([], 'Berhasil menambah formulir', [], 200));
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

export const validation = (method: string) => {
    switch (method) {
        case 'settingPrivacy': {
            return [
                body('privacy').notEmpty().withMessage('Privacy tidak boleh kosong').isBoolean().withMessage('Privacy harus berupa boolean'),
            ]
        }

        case 'addFormulir': {
            return [
                body('name').notEmpty().withMessage('Nama tidak boleh kosong').isString().withMessage('Nama harus berupa string'),
            ]
        }

        default: {
            return []
        }
    }
}