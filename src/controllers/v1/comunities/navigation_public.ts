import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import asyncHandler from "../../../middleware/async";
import { sendError, sendResponse } from "../../../libraries/rest";
import { body, validationResult } from "express-validator";
import { createMemberPermission, createRolePermission, joinedGroup, myPermissionGroup } from "./helper";
import { pagination } from "../../../libraries/helper";

const prisma = new PrismaClient();

export const listNavigationGroup = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { slug } = req.params;
    let permission: Array<any> = [];

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    if (req.user) {
        const is_joined = await joinedGroup(group, req.user.id);
        if (!is_joined) {
            return next(new sendError('Anda belum bergabung dengan komunitas ini', [], 'PROCESS_ERROR', 400));
        }

        const member_role = await prisma.groupMember.findFirst({
            where: {
                group_id: group.id,
                user_id: req.user.id
            },
        })

        const member_role_permission = await prisma.groupRolePermission.findMany({
            where: {
                group_role_id: member_role?.group_role_id
            },
        })

        member_role_permission.forEach((item: any) => {
            if (item?.status === true) {
                let dataNav = navigation(item?.slug);

                if (dataNav.length > 0) {
                    dataNav.forEach((nav: any) => {
                        let findName = permission.find((item: any) => item.name === nav.name);
                        if (!findName) {
                            permission.push(nav);
                        }
                    })
                }
            }
        })

        return res.status(200).json(new sendResponse(permission, 'Berhasil mengambil data', {}, 200));
    }

    return res.status(200).json(new sendResponse(permission, 'Berhasil mengambil data', {}, 200));
});

export const permissionAccessPage = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { slug, type } = req.params;

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    if (req.user) {
        const is_joined = joinedGroup(group, req.user.id);
        if (!is_joined) {
            return next(new sendError('Anda belum bergabung dengan komunitas ini', [], 'PROCESS_ERROR', 400));
        }

        const member_role = await prisma.groupMember.findFirst({
            where: {
                group_id: group.id,
                user_id: req.user.id
            },
        })

        const member_role_permission = await prisma.groupRolePermission.findMany({
            where: {
                group_role_id: member_role?.group_role_id
            },
        })


        let status = false;
        const izin = permission(type)

        if (izin.length > 0) {
            izin.forEach((item: any) => {
                const findPermission = member_role_permission.find((permission: any) => permission?.slug === item.permission);
                if (findPermission) {
                    status = findPermission?.status === true ? true : false;
                }
            })
        }

        return res.status(200).json(new sendResponse({
            status: status,
        }, 'Berhasil mengambil data', {}, 200));
    }

    return res.status(200).json(new sendResponse({
        status: false,
    }, 'Berhasil mengambil data', {}, 200));
})

export const navigation = (permission: string) => {
    switch (permission) {
        case 'terima_dan_tolak_permintaan_posting': {
            return [
                {
                    name: 'Permintaan posting',
                    type: 'request-post'
                }
            ]
        }

        case 'terima_dan_tolak_anggota': {
            return [
                {
                    name: 'Permintaan bergabung',
                    type: 'request-member'
                },
            ]
        }

        case 'kelola_komunitas': {
            return [
                {
                    name: 'Postingan dilaporkan anggota',
                    type: 'report'
                },
                {
                    name: 'Role',
                    type: 'role'
                },
                // {
                //     name: 'Feature',
                //     type: 'feature'
                // },
                {
                    name: 'Edit',
                    type: 'edit'
                },
                {
                    name: 'Pengaturan',
                    type: 'settings'
                },
                {
                    name: 'Anggota',
                    type: 'member'
                }
            ]
        }

        case 'analitik': {
            return [
                {
                    name: 'Analitik',
                    type: 'analytics'
                }
            ]
        }

        case 'pembayaran': {
            return [
                {
                    name: 'Pembayaran',
                    type: 'payment'
                }
            ]
        }

        case 'navigasi': {
            return [
                {
                    name: 'Navigasi',
                    type: 'navigation'
                }
            ]
        }

        case 'tampilan': {
            return [
                {
                    name: 'Tampilan',
                    type: 'appearance'
                },
            ]
        }

        default: {
            return [

            ]
        }
    }
}

const permission = (type: string) => {
    switch (type) {
        case 'member': {
            return [
                {
                    name: 'Anggota',
                    type: 'member',
                    permission: 'kelola_komunitas'
                }
            ]
        }

        case 'request-member': {
            return [
                {
                    name: 'Permintaan bergabung',
                    type: 'request-member',
                    permission: 'terima_dan_tolak_anggota'
                }
            ]
        }

        case 'request-post': {
            return [
                {
                    name: 'Permintaan posting',
                    type: 'request-post',
                    permission: 'terima_dan_tolak_permintaan_posting'
                }
            ]
        }

        case 'report': {
            return [
                {
                    name: 'Postingan dilaporkan anggota',
                    type: 'report',
                    permission: 'kelola_komunitas'
                }
            ]
        }

        case 'role': {
            return [
                {
                    name: 'Role',
                    type: 'role',
                    permission: 'kelola_komunitas'
                }
            ]
        }

        // case 'feature': {
        //     return [
        //         {
        //             name: 'Feature',
        //             type: 'feature',
        //             permission: 'kelola_komunitas'
        //         }
        //     ]
        // }

        case 'edit': {
            return [
                {
                    name: 'Edit',
                    type: 'edit',
                    permission: 'kelola_komunitas'
                }
            ]
        }

        case 'appearance': {
            return [
                {
                    name: 'Tampilan',
                    type: 'appearance',
                    permission: 'kelola_komunitas'
                }
            ]
        }

        case 'settings': {
            return [
                {
                    name: 'Pengaturan',
                    type: 'settings',
                    permission: 'kelola_komunitas'
                }
            ]
        }

        case 'analytics': {
            return [
                {
                    name: 'Analitik',
                    type: 'analytics',
                    permission: 'analitik'
                }
            ]
        }

        case 'payment': {
            return [
                {
                    name: 'Pembayaran',
                    type: 'payment',
                    permission: 'pembayaran'
                }
            ]
        }

        case 'navigation': {
            return [
                {
                    name: 'Navigasi',
                    type: 'navigation',
                    permission: 'navigasi'
                }
            ]
        }

        default: {
            return []
        }

    }
}
