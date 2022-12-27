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

export const requestPayout = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { slug } = req.params;

    const {
        amount,
        id,
    } = req.body;

    const group_payment_id = id;

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group) {
        return next(new sendError('Group tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const permission = await myPermissionGroup(group, req.user?.id, 'pembayaran')
    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses', [], 'NOT_FOUND', 404));
    }

    const dompet = await prisma.groupDompet.findFirst({
        where: {
            group_id: group.id
        }
    })

    if (!dompet) {
        return next(new sendError('Dompet tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    if (dompet.balance < amount) {
        return next(new sendError('Saldo tidak cukup', [], 'PROCESS_ERROR', 400));
    }

    const transaction = await prisma.groupTransaction.findFirst({
        where: {
            group_id: group.id,
            status: 'pending'
        }
    })

    if (transaction) {
        return next(new sendError('Ada transaksi yang belum selesai', [], 'PROCESS_ERROR', 400));
    }

    const payment = await prisma.groupPayment.findFirst({
        where: {
            id: group_payment_id,
        },
        include: {
            method_payment: true
        }
    })

    if (!payment) {
        return next(new sendError('Metode pembayaran tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    try {
        await prisma.$transaction(async (prisma) => {
            await prisma.groupDompet.update({
                where: {
                    id: dompet.id
                },
                data: {
                    balance: parseInt(dompet.balance.toString()) - amount,
                    payout: parseInt(dompet.payout.toString()) + amount,
                }
            })

            await prisma.groupTransaction.create({
                data: {
                    group_id: group.id,
                    amount: amount,
                    method: JSON.stringify(payment.method_payment),
                    account: payment.method_payment.name,
                    data_json: JSON.stringify(payment),
                    note: 'Sedang proses pengecekan!',
                }
            })
        })

        return res.json(new sendResponse({}, 'Berhasil mengajukan penarikan', {}, 200));
    } catch (error: any) {
        return next(new sendError('Terjadi kesalahan', error, 'PROCESS_ERROR', 400));
    }
})

export const transactions = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { slug } = req.params;

    let { page, limit, search, order } = req.query;
    let where: any, orderBy: Array<any> = [];

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

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group) {
        return next(new sendError('Group tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const permission = await myPermissionGroup(group, req.user?.id, 'pembayaran')

    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses', [], 'NOT_FOUND', 404));
    }

    const transactions = await prisma.groupTransaction.findMany({
        where: {
            group_id: group.id
        },
        orderBy: orderBy.length > 0 ? orderBy : [
            {
                created_at: order
            }
        ],
        skip: (page - 1) * limit,
        take: limit,
    })

    await Promise.all(transactions.map(async (transaction: any) => {
        transaction.amount = parseInt(transaction.amount.toString())
        transaction.data_json = JSON.parse(transaction.data_json)
        transaction.method = JSON.parse(transaction.method)
    }))

    const total = await prisma.groupTransaction.count({
        where: {
            group_id: group.id
        }
    })

    return res.json(new sendResponse(transactions, 'Berhasil mengambil data', pagination(page, limit, total), 200));
})

export const validation = (method: string) => {
    switch (method) {
        case 'requestPayout': {
            return [
                body('amount').notEmpty().withMessage('Jumlah tidak boleh kosong'),
                body('id').notEmpty().withMessage('Id metode pembayaran tidak boleh kosong'),
            ]
            break;
        }

        default: {
            return [];
        }
    }
}