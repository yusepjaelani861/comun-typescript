import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import asyncHandler from "../../../middleware/async";
import { sendError, sendResponse } from "../../../libraries/rest";
import { body, validationResult } from "express-validator";

const prisma = new PrismaClient();

export const listConfig = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { id } = req.user;

    const config = await prisma.config.findMany({
        orderBy: {
            created_at: 'asc'
        },
        select: {
            id: true,
            name: true,
            label: true,
        }
    });

    if (!config) {
        return next(new sendError('Config not found', [], 'NOT_FOUND', 404));
    }

    return res.status(200).json(new sendResponse(config, 'Config found', {}, 200));
})

export const getMyConfig = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { id } = req.user;

    const user_config = await prisma.userConfig.findMany({
        where: {
            user_id: id
        },
        include: {
            config: {
                select: {
                    id: true,
                    name: true,
                    label: true,
                }
            }
        }
    })

    res.status(200).json(new sendResponse(user_config, 'User config found', {}, 200));
})

export const updateMyConfig = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { id } = req.user;

    const { config_label, user_config_value } = req.body;

    const config = await prisma.config.findFirst({
        where: {
            label: config_label
        }
    })

    if (!config) {
        return next(new sendError('Config not found', [], 'NOT_FOUND', 404));
    }

    const user_config = await prisma.userConfig.findFirst({
        where: {
            user_id: id,
            config_id: config.id
        },
    })

    if (!user_config) {
        const new_user_config = await prisma.userConfig.create({
            data: {
                user_id: id,
                config_id: config.id,
                value: user_config_value
            }
        })

        return res.status(200).json(new sendResponse(new_user_config, 'User config created', {}, 200));
    }

    const updated_user_config = await prisma.userConfig.update({
        where: {
            id: user_config.id
        },
        data: {
            value: user_config_value
        },
        include: {
            config: {
                select: {
                    id: true,
                    name: true,
                    label: true,
                }
            }
        }
    })

    return res.status(200).json(new sendResponse(updated_user_config, 'User config updated', {}, 200));
})

export const validation = (method : string) => {
    switch (method) {
        case 'updateMyConfig': {
            return [
                body('config_label').notEmpty().withMessage('Config label is required'),
                body('user_config_value').notEmpty().withMessage('User config value is required'),
            ]
        }

        default: {
            return [];
        }
    }
}