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

export const balance = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { slug } = req.params;

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group) {
        return next(new sendError('Group tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const permission = await myPermissionGroup(group, req.user?.id, 'pembayaran');

    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses', [], 'NOT_FOUND', 404));
    }

    const dompet = await prisma.groupDompet.findFirst({
        where: {
            group_id: group.id
        }
    })

    if (!dompet) {
        await prisma.groupDompet.create({
            data: {
                group_id: group.id,
            }
        })
    }

    let balance: any = await prisma.groupDompet.findFirst({
        where: {
            group_id: group.id
        }
    })

    balance.balance = balance.balance ? parseInt(balance.balance) : 0;
    balance.payout = balance.payout ? parseInt(balance.payout) : 0;
    balance.total_earning = balance.total_earning ? parseInt(balance.total_earning) : 0;

    return res.json(new sendResponse(balance, 'Berhasil mengambil data', {}, 200));
})

export const methods = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const methods = await prisma.methodPayment.findMany({
        where: {
            status: true
        },
        orderBy: {
            name: 'asc'
        }
    });

    let ewallet: Array<any> = [], bank: Array<any> = [];
    methods.forEach((method: any) => {
        if (method.type == 'ewallet') {
            ewallet.push(method);
        }
        if (method.type == 'bank') {
            bank.push(method);
        }
    });

    const results = [
        {
            name: 'E-Wallet',
            children: ewallet
        },
        {
            name: 'Bank',
            children: bank
        }
    ];

    return res.json(new sendResponse(results, 'Berhasil mengambil data', {}, 200));
})

export const getPayment = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { slug } = req.params;

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group) {
        return next(new sendError('Group tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const permission = await myPermissionGroup(group, req.user?.id, 'pembayaran');

    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses', [], 'NOT_FOUND', 404));
    }

    const payment = await prisma.groupPayment.findMany({
        where: {
            group_id: group.id
        },
        orderBy: {
            created_at: 'desc'
        },
        include: {
            method_payment: true
        }
    })

    return res.json(new sendResponse(payment, 'Berhasil mengambil data', {}, 200));
})

export const createPayment = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { slug } = req.params;
    const {
        id,
        number,
        name
    } = req.body;
    const 
        method_payment_id = id,
        group_payment_number = number,
        group_payment_name = name;

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group) {
        return next(new sendError('Group tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const permission = await myPermissionGroup(group, req.user?.id, 'pembayaran');

    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses', [], 'NOT_FOUND', 404));
    }

    const method = await prisma.methodPayment.findFirst({
        where: {
            id: method_payment_id
        }
    })

    if (!method) {
        return next(new sendError('Metode pembayaran tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const payment = await prisma.groupPayment.create({
        data: {
            group_id: group.id,
            method_payment_id: method.id,
            name: group_payment_name,
            number: group_payment_number,
        }
    })

    return res.json(new sendResponse(payment, 'Berhasil membuat metode pembayaran', {}, 200));
})

export const removePayment = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    let { slug, id } = req.params;

    id = parseInt(id);

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group) {
        return next(new sendError('Group tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const permission = await myPermissionGroup(group, req.user?.id, 'pembayaran');

    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses', [], 'NOT_FOUND', 404));
    }

    const payment = await prisma.groupPayment.findFirst({
        where: {
            id: id
        }
    })

    if (!payment) {
        return next(new sendError('Metode pembayaran tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    await prisma.groupPayment.delete({
        where: {
            id: id
        }
    })

    return res.json(new sendResponse({}, 'Berhasil menghapus metode pembayaran', {}, 200));
})

export const validation = (method: string) => {
    switch (method) {
        case 'createPayment': {
            return [
                body('id').exists().withMessage('Method payment id is required'),
                body('number').exists().withMessage('Account number is required'),
                body('name').optional(),
            ]
        }

        default: {
            return []
        }
    }
}