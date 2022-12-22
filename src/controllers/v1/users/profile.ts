import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import asyncHandler from "../../../middleware/async";
import { sendError, sendResponse } from "../../../libraries/rest";
import { body, validationResult } from "express-validator";
import { generate_otp } from "../../../libraries/helper";
import { sendEmail } from "../../../libraries/nodemailer";
import moment from "moment";

const prisma = new PrismaClient();

export const getProfile = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { id } = req.user;

    const user = await prisma.user.findUnique({
        where: {
            id: id
        },
        select: {
            id: true,
            name: true,
            username: true,
            bio: true,
            avatar: true,
            background: true,
            email: true,
            email_verified_at: true,
            phonenumber: true,
            country_code_phonenumber: true,
            created_at: true,
            updated_at: true,

        }
    });

    if (!user) {
        return next(new sendError('User not found', [], 'NOT_FOUND', 404));
    }

    return res.status(200).json(new sendResponse(user, 'User found', {}, 200));
})

export const updateProfile = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { id } = req.user;
    const { username, name, bio, avatar } = req.body;

    const user : any = await prisma.user.findUnique({
        where: {
            id: id
        },
    });

    if (!user) {
        return next(new sendError('User tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    if (user.username_updated_at > new Date(new Date().setDate(new Date().getDate() - 7)) && username !== user.username) { 
        return next(new sendError('Username tidak bisa diubah karena sudah pernah diubah kurang dari 7 hari', [], 'PROCESS_ERROR', 400));
    }

    let data;
    if (username) {
        data = {
            username: username,
            name: name,
            bio: bio,
            avatar: avatar,
            username_updated_at: moment().format()
        }
    } else {
        data = {
            username: username || user.username,
            name: name,
            bio: bio,
            avatar: avatar,
        }
    }

    const userUpdated = await prisma.user.update({
        where: {
            id: id
        },
        data: data,
    })

    return res.status(200).json(new sendResponse({}, 'User updated', {}, 200));
})

export const updateAvatar = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { id } = req.user;

    const { avatar } = req.body;

    const user = await prisma.user.findUnique({
        where: {
            id: id
        },
    });

    if (!user) {
        return next(new sendError('User not found', [], 'NOT_FOUND', 404));
    }

    const userUpdated = prisma.user.update({
        where: {
            id: id
        },
        data: {
            avatar: avatar,
        },
    })

    return res.status(200).json(new sendResponse(userUpdated, 'User updated', {}, 200));
})

export const validation = (method: string) => {
    switch (method) {
        case 'updateProfile': {
            return [
                body('username')
                    .optional()
                    // alpha_dash
                    .matches(/^[a-zA-Z0-9_.]+$/).withMessage('Username must be alphanumeric, underscore, and dash only')
                    .isLength({ max: 30 }).withMessage('Username must be less than 30 characters')
                    .custom(async (value, { req }) => {
                        if (value) {
                            const user = await prisma.user.findFirst({ where: { username: value } })
                            if (user && user.id !== req.user.id) {
                                throw new Error('Username already exists')
                            }
                        }
                    }),
                body('bio').isLength({ max: 100 }).withMessage('Bio must be less than 100 characters'),
                body('name').isLength({ max: 30 }).withMessage('Name must be less than 30 characters'),
                body('avatar').optional().isURL().withMessage('Avatar must be a valid URL'),
            ]
            break;
        }

        case 'updateAvatar': {
            return [
                body('avatar').isURL().withMessage('Avatar must be a valid URL'),
            ]
            break;
        }

        default: {
            return [];
        }
    }
}


