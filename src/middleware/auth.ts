import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import asyncHandler from './async';
import { Request, Response, NextFunction } from 'express';
import { sendError } from '../libraries/rest';

const prisma = new PrismaClient()
const jwt_secret = process.env.JWT_SECRET || 'secret';

export const protect = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return next(new sendError('Not authorized to access this route', [], 'UNAUTHORIZED', 401));
    }

    const decoded: any = jwt.verify(token, jwt_secret);

    const user = await prisma.user.findFirst({
        where: {
            id: decoded.id
        },
        select: {
            id: true,
            name: true,
            username: true,
            email: true,
            email_verified_at: true,
            country_code_phonenumber: true,
            bio: true,
            avatar: true,
            background: true,
            created_at: true,
        }
    });

    if (!user) {
        return next(new sendError('Not authorized to access this route', [], 'UNAUTHORIZED', 401));
    }

    req.user = user;

    next();
})

export const withtoken = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token
    }

    if (token) {
        const decoded: any = jwt.verify(token, jwt_secret);

        const user = await prisma.user.findFirst({
            where: {
                id: decoded.id
            },
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                email_verified_at: true,
                country_code_phonenumber: true,
                bio: true,
                avatar: true,
                background: true,
                created_at: true,
            }
        });

        if (!user) {
            return next(new sendError('Not authorized to access this route', [], 'UNAUTHORIZED', 401));
        }

        req.user = user;
    }

    next();
})