import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import asyncHandler from "../../../middleware/async";
import { sendError, sendResponse } from "../../../libraries/rest";
import { body, validationResult } from "express-validator";
import { createMemberPermission, createRolePermission, joinedGroup, myPermissionGroup } from "./helper";
import { pagination } from "../../../libraries/helper";

const prisma = new PrismaClient();

export const addNavigation = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { slug } = req.params;

    const {
        title,
        type,
        url,
        icon,
    } = req.body;

    const 
        group_navigation_title = title,
        group_navigation_type = type,
        group_navigation_url = url,
        group_navigation_icon = icon;

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const permission = myPermissionGroup(group, req.user.id, 'navigasi');

    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses', [], 'PROCESS_ERROR', 400));
    }


    try {
        await prisma.$transaction(async (prisma) => {
            const navigation = await prisma.groupNavigation.findMany({
                where: {
                    group_id: group.id,
                }
            })

            await Promise.all(navigation.map(async (item: any) => {
                await prisma.groupNavigation.update({
                    where: {
                        id: item.id
                    },
                    data: {
                        order: item.order + 1
                    }
                })
            }))

            const create_navigation = await prisma.groupNavigation.create({
                data: {
                    group_id: group.id,
                    title: group_navigation_title,
                    type: group_navigation_type,
                    url: group_navigation_url,
                    icon: group_navigation_icon ?? 'https://ui-avatars.com/api/?name='+ group_navigation_title +'&background=0D8ABC&color=fff&size=128',
                    order: 1,
                }
            })

            return res.status(200).json(new sendResponse(create_navigation, 'Navigasi berhasil ditambahkan', {}, 200))
        })
    } catch (error) {
        return next(new sendError('Terjadi kesalahan', [], 'PROCESS_ERROR', 400));
    }
})

export const removeNavigation = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { slug, id } = req.params;

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })


    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const permission = myPermissionGroup(group, req.user.id, 'navigasi');

    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses', [], 'PROCESS_ERROR', 400));
    }

    const navigation = await prisma.groupNavigation.findFirst({
        where: {
            id: parseInt(id),
            group_id: group.id
        }
    })

    if (!navigation) {
        return next(new sendError('Navigasi tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    try {
        await prisma.$transaction(async (prisma) => {
            await prisma.groupNavigation.delete({
                where: {
                    id: parseInt(id)
                }
            })

            return res.status(200).json(new sendResponse({}, 'Navigasi berhasil dihapus', {}, 200))
        })
    } catch (error) {
        return next(new sendError('Terjadi kesalahan', [], 'PROCESS_ERROR', 400));
    }
})

export const listNavigation = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
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

    const permission = myPermissionGroup(group, req.user.id, 'navigasi');

    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses', [], 'PROCESS_ERROR', 400));
    }

    const navigation = await prisma.groupNavigation.findMany({
        where: {
            group_id: group.id
        },
        orderBy: {
            order: 'asc'
        },

    })

    return res.status(200).json(new sendResponse(navigation, 'Navigasi berhasil didapatkan', {}, 200))
})

export const updateOrderNavigation = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { slug } = req.params;
    const { order } = req.body;

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const permission = myPermissionGroup(group, req.user.id, 'navigasi');

    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses', [], 'PROCESS_ERROR', 400));
    }

    try {
        await prisma.$transaction(async (prisma) => {
            await Promise.all(order.map(async (item: any) => {
                await prisma.groupNavigation.update({
                    where: {
                        id: item.id
                    },
                    data: {
                        order: item.order
                    }
                })
            }))

            const navigation = await prisma.groupNavigation.findMany({
                where: {
                    group_id: group.id
                },
                orderBy: {
                    order: 'asc'
                },
            })

            return res.status(200).json(new sendResponse(navigation, 'Navigasi berhasil diurutkan', {}, 200))
        })
    } catch (error) {
        return next(new sendError('Terjadi kesalahan', [], 'PROCESS_ERROR', 400));
    }
})

export const validation = (method: string) => {
    switch (method) {
        case 'addNavigation': {
            return [
                body(
                    "title",
                    "Group navigation title is required"
                ).exists(),
                body("type", "Group navigation type is required")
                    .exists()
                    .isIn(["url", "post", "list_post", "list_member", "leaderboard"])
                    .withMessage(
                        "Group navigation type must be url, post, list_post, list_member, leaderboard"
                    ),
                body("url", "Group navigation url is required")
                    .exists()
                    // .isURL().withMessage('Group navigation url must be url'),
                    .custom(async (value, { req }) => {
                        if (req.body.type == "url") {
                            let regexURL =
                                /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/;
                            if (!value.match(regexURL)) {
                                throw new Error("Group navigation url must be url");
                            }
                        }
                        return true;
                    }),
                body("icon", "Group navigation icon is required")
                    // jika ada, maka validasi isURL()
                    .optional({ checkFalsy: true })
                    .isURL()
                    .withMessage("Group navigation icon must be url"),
            ]
            break;
        }

        case 'updateOrderNavigation': {
            return [
                body("order", "Order is required")
                    .exists()
                    .isArray()
                    .withMessage("Order must be array")
                    .notEmpty()
                    .withMessage("Order must be not empty"),
            ]
            break;
        }

        default: {
            return []
        }
    }
}