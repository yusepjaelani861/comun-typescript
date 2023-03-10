import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import asyncHandler from "../../../middleware/async";
import { sendError, sendResponse } from "../../../libraries/rest";
import { body, validationResult } from "express-validator";
import { createMemberPermission, createRolePermission, myPermissionGroup } from "./helper";
import { pagination } from "../../../libraries/helper";
import moment from "moment";

const prisma = new PrismaClient();

export const kickMember = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { slug } = req.params;

    const { group_member_id } = req.body;

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const permission = myPermissionGroup(group, req.user.id, 'keluarkan_anggota');

    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses', [], 'PROCESS_ERROR', 400));
    }

    const group_member = await prisma.groupMember.findFirst({
        where: {
            id: group_member_id,
        }
    })

    if (!group_member) {
        return next(new sendError('Anggota tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const owner : any = await prisma.groupRole.findFirst({
        where: {
            id: group_member.group_role_id
        }
    })

    if (owner?.slug === 'owner') {
        return next(new sendError('Anda atau pemilik tidak dapat mengeluarkan pemilik komunitas', [], 'PROCESS_ERROR', 400));
    }

    const delete_group_member = await prisma.groupMember.delete({
        where: {
            id: group_member_id,
        }
    })

    return res.status(200).json(new sendResponse({}, 'Anggota berhasil dihapus', {}, 200));
})

export const requestJoinComunity = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { slug } = req.params;
    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const permission = myPermissionGroup(group, req.user.id, 'terima_dan_tolak_anggota');

    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses', [], 'PROCESS_ERROR', 400));
    }

    const request_members = await prisma.groupMember.findMany({
        where: {
            group_id: group.id,
            status: 'pending',
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
            id: 'desc'
        }
    })

    const total_members = await prisma.groupMember.count({
        where: {
            group_id: group.id,
            status: 'pending',
        }
    })

    return res.status(200).json(new sendResponse(request_members, 'Berhasil mengambil data', pagination(page, limit, total_members), 200));
})

export const actionRequestJoin = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { slug } = req.params;
    const { group_member_user_id, action } = req.body;

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const permission = myPermissionGroup(group, req.user.id, 'terima_dan_tolak_anggota');

    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses', [], 'PROCESS_ERROR', 400));
    }

    const member = await prisma.groupMember.findFirst({
        where: {
            group_id: group.id,
            user_id: group_member_user_id,
            status: 'pending',
        }
    })

    if (!member) {
        return next(new sendError('Anggota yang dipilih tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    if (action == 'accept') {
        await prisma.groupMember.update({
            where: {
                id: member.id
            },
            data: {
                status: 'joined'
            }
        })

        return res.status(200).json(new sendResponse({}, 'Berhasil menerima permintaan', {}, 200));
    }

    if (action == 'reject') {
        await prisma.groupMember.delete({
            where: {
                id: member.id
            }
        })

        return res.status(200).json(new sendResponse({}, 'Berhasil menolak permintaan', {}, 200));
    }

    return next(new sendError('Action tidak ditemukan', [], 'NOT_FOUND', 404));
})

export const editComunity = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { slug } = req.params;

    const {
        group_name,
        group_tagline,
        group_slug,
        group_avatar,
        group_background,
        group_color,
        group_privacy,
    } = req.body;

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const permission = myPermissionGroup(group, req.user.id, 'kelola_komunitas');

    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses', [], 'PROCESS_ERROR', 400));
    }

    if (group.slug_updated_at && moment().diff(moment(group.slug_updated_at), 'days') < 7) {
        return next(new sendError('Saat ini Anda tidak bisa mengubah slug komunitas', [], 'PROCESS_ERROR', 400));
    }

    const update_group = await prisma.group.update({
        where: {
            id: group.id
        },
        data: {
            name: group_name ? group_name : group.name,
            tagline: group_tagline ? group_tagline : group.tagline,
            slug: group_slug ? group_slug : group.slug,
            avatar: group_avatar ? group_avatar : group.avatar,
            background: group_background ? group_background : group.background,
            color: group_color ? group_color : group.color,
            privacy: group_privacy ? group_privacy : group.privacy,
            slug_updated_at: group_slug ? moment().format() : group.slug_updated_at,
        }
    })

    return res.status(200).json(new sendResponse(update_group, 'Berhasil mengubah komunitas', {}, 200));
})

export const validation = (method : string) => {
    switch (method) {
        case 'kickMember': {
            return [
                body('group_member_id').notEmpty().withMessage('grop_member_id tidak boleh kosong'),
            ]
            break;
        }

        case 'actionRequestJoin': {
            return [
                body('action').notEmpty().withMessage('action tidak boleh kosong').isIn(['accept', 'reject']).withMessage('action tidak valid'),
                body('group_member_user_id').notEmpty().withMessage('group_member_user_id tidak boleh kosong'),
            ]
            break;
        }

        case 'editComunity': {
            return [
                body('group_name').optional(),
                body('group_tagline').optional(),
                body('group_slug').optional(),
                body('group_avatar').optional(),
                body('group_background').optional(),
                body('group_color').optional(),
                body('group_privacy').optional(),
            ]
            break;
        }

        default: {
            return [];
        }
    }
}