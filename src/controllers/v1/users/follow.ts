import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import asyncHandler from "../../../middleware/async";
import { sendError, sendResponse } from "../../../libraries/rest";
import { body, validationResult } from "express-validator";
import { AnyTxtRecord } from "dns";
import { pagination } from "../../../libraries/helper";

const prisma = new PrismaClient()

export const followUser = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { id } = req.body

    if (req.user?.id === id) {
        return next(new sendError('Anda tidak bisa follow diri sendiri', [], 'NOT_FOUND', 404))
    }

    const user = await prisma.user.findFirst({
        where: {
            id: id,
        }
    })

    if (!user) {
        return next(new sendError('User tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    let cekfollow: any, message: string = 'Berhasil follow';
    cekfollow = await prisma.userFollow.findFirst({
        where: {
            user_id: id,
            follow_user_id: req.user?.id
        }
    })

    if (!cekfollow) {
        await prisma.userFollow.create({
            data: {
                user_id: id,
                follow_user_id: req.user?.id
            }
        })

        const cek_user_config = await prisma.userConfig.findFirst({
            where: {
                user_id: id,
                config: {
                    label: 'notification_following'
                }
            },
            include: {
                config: true
            }
        })

        if (cek_user_config?.value === true) {
            await prisma.notification.create({
                data: {
                    user_id: id,
                    from_user_id: req.user?.id,
                    type: 'follow',
                    body: `<strong>${req.user?.name}</strong> mengikuti anda`,
                    url: `/@${req.user?.username}`
                }
            })
        }

        message = 'Anda berhasil follow'
    }

    if (cekfollow) {
        await prisma.userFollow.delete({
            where: {
                id: cekfollow.id
            }
        })

        await prisma.notification.deleteMany({
            where: {
                user_id: id,
                from_user_id: req.user?.id,
                type: 'follow',
                url: `/@${req.user?.username}`
            }
        })

        message = 'Anda batal follow'
    }

    return res.status(200).json(new sendResponse([], message, {}, 200));
})

export const listFollow = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { username } = req.params;
    let { page, limit, type } = req.query;
    let where: any = {};

    page = page ? parseInt(page) : 1;
    limit = limit ? parseInt(limit) : 10;
    type = type ? type : 'followers';

    const user = await prisma.user.findFirst({
        where: {
            username: username
        }
    })

    if (!user) {
        return next(new sendError('User tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    switch (type) {
        case 'followers':
            where = {
                ...where,
                user_id: user.id
            }
            break;

        case 'following':
            where = {
                ...where,
                follow_user_id: user.id
            }
            break;
        default:
            where = {
                ...where,
                user_id: user.id
            }
            break;
    }

    const followers = await prisma.userFollow.findMany({
        where: where,
        include: {
            follower_user: {
                select: {
                    id: true,
                    username: true,
                    name: true,
                    avatar: true,
                    followers: true,
                    followings: true,
                },
            },
            user: {
                select: {
                    id: true,
                    username: true,
                    name: true,
                    avatar: true,
                    followers: true,
                },
            }
        },
        skip: (page - 1) * limit,
        take: limit,
    })

    await Promise.all(followers.map(async (item: any) => {
        switch (type) {
            case 'followers':
                item.is_follow = item.follower_user.followers.some((item: any) => item.follow_user_id === req.user?.id) ? true : false;
                item.is_me = item.follower_user.followers.some((item: any) => item.user_id === req.user?.id) ? true : false;
                item.user = item.follower_user;
                delete item.follower_user;
                delete item.user.followers;
                delete item.user.followings;
                break;
            case 'following':
                item.is_follow = item.user.followers.some((item: any) => item.user_id === req.user?.id) ? true : false;
                item.is_me = item.follower_user.followers.some((item: any) => item.user_id === req.user?.id) ? true : false;
                delete item.follower_user;
                delete item.user.followers;
                break;
            default:
                item.is_follow = false;
                break;
        }
    }))

    const total = await prisma.userFollow.count({
        where: where
    })

    return res.status(200).json(new sendResponse(followers, 'Berhasil mengambil data', pagination(page, limit, total), 200));
})

export const validation = (method: string) => {
    switch (method) {
        case 'followUser': {
            return [
                body('id').notEmpty().withMessage('id tidak boleh kosong'),
            ]
            break;
        }
        default: {
            return []
            break;
        }
    }
}