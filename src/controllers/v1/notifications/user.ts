import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import asyncHandler from "../../../middleware/async";
import { sendError, sendResponse } from "../../../libraries/rest";
import { body, validationResult } from "express-validator";
import { pagination } from "../../../libraries/helper";
import moment from "moment";
import { stringify, parse } from "himalaya";
import Randomstring from "randomstring";
import { joinedGroup, myPermissionGroup } from "../comunities/helper";

const prisma = new PrismaClient();

export const notifications = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    let { page, limit, search, order, read, time } = req.query;
    let where: any, orderBy: Array<any> = [], message: string = 'Berhasil mengambil data';

    page = page ? parseInt(page) : 1;
    limit = limit ? parseInt(limit) : 10;
    order = order ? order : 'desc';

    if (Object.keys(req.query).length > 0) {
        Object.keys(req.query).forEach((filter, index) => {
            let key_and_op = filter.split('.');

            if (key_and_op.length > 1) {
                let key = key_and_op[0];
                let op = key_and_op[1];
                let value = req.query[filter];

                if (key == 'sort') {
                    orderBy.push({
                        [op]: value
                    })
                }
            }
        })
    }

    where = {
        user_id: req.user?.id
    }

    switch (time) {
        case 'today': {
            where = {
                ...where,
                created_at: {
                    lte: new Date(),
                    gte: new Date(moment().startOf('day').format('YYYY-MM-DD HH:mm:ss')),
                },
            }
            message = 'Berhasil mengambil data hari ini'
            break;
        }

        case 'yesterday': {
            where = {
                ...where,
                created_at: {
                    lte: new Date(moment().subtract(1, 'days').endOf('day').format('YYYY-MM-DD HH:mm:ss')),
                    gte: new Date(moment().subtract(1, 'days').startOf('day').format('YYYY-MM-DD HH:mm:ss')),
                },
            }
            message = 'Berhasil mengambil data kemarin'
            break;
        }

        case 'older': {
            where = {
                ...where,
                created_at: {
                    lte: new Date(moment().subtract(1, 'days').startOf('day').format('YYYY-MM-DD HH:mm:ss')),
                },
            }
            message = 'Berhasil mengambil data lebih lama'
            break;
        }

        default: {
            break;
        }
    }

    if (read) {
        where = {
            ...where,
            is_read: read == 'true' ? true : false
        }
    }

    const notifications = await prisma.notification.findMany({
        where: where,
        orderBy: orderBy.length > 0 ? orderBy : [
            {
                created_at: order
            }
        ],
        skip: (page - 1) * limit,
        take: limit,
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    username: true,
                    avatar: true
                }
            }
        }
    })

    const total = await prisma.notification.count({
        where: where
    })

    await Promise.all(notifications.map(async (notification: any) => {
        notification.created_at_formatted = moment(notification.created_at).locale('id').fromNow();
    }))

    return res.json(new sendResponse(notifications, message, pagination(page, limit, total), 200));
})

export const readNotification = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { id } = req.body;

    const notification = await prisma.notification.findFirst({
        where: {
            id: id,
            user_id: req.user?.id
        }
    })

    if (!notification) {
        return next(new sendError('Notifikasi tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    await prisma.notification.update({
        where: {
            id: id
        },
        data: {
            is_read: true
        }
    })

    return res.json(new sendResponse([], 'Berhasil membaca notifikasi', [], 200));
})

export const hasUnread = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const notification = await prisma.notification.findFirst({
        where: {
            user_id: req.user?.id,
            is_read: false
        }
    })

    return res.json(new sendResponse(notification ? true : false, 'Berhasil mengambil data', [], 200));
})

export const validation = (method: string) => {
    switch (method) {
        case 'readNotification': {
            return [
                body('id').notEmpty().withMessage('ID notifikasi tidak boleh kosong')
            ]
        }

        default: {
            return [];
        }
    }
}