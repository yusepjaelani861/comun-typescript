import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import asyncHandler from "../../../middleware/async";
import { sendError, sendResponse } from "../../../libraries/rest";
import { body, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import { sendEmail } from "../../../libraries/nodemailer";
import { generate_otp } from "../../../libraries/helper";

const prisma = new PrismaClient();

export const updatePassword = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { id } = req.user;
    const { old_password, new_password, new_password_confirmation } = req.body;

    const user = await prisma.user.findFirst({
        where: {
            id: id
        },
    });

    if (!user) {
        return next(new sendError('User tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const isMatch = await bcrypt.compare(old_password, user.password as string);
    if (!isMatch) {
        return next(new sendError('Password lama tidak sesuai', [], 'PROCESS_ERROR', 400));
    }

    if (new_password !== new_password_confirmation) {
        return next(new sendError('Konfirmasi password baru tidak sesuai', [], 'PROCESS_ERROR', 400));
    }

    const salt = await bcrypt.genSalt(10);

    const data = {
        password: await bcrypt.hash(new_password, salt),
    }

    const userUpdated = await prisma.user.update({
        where: {
            id: id
        },
        data: data
    });

    return res.status(200).json(new sendResponse({}, 'Password berhasil diubah', {}, 200));
})

// Change email
export const sendCode = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { id } = req.user;

    const user = await prisma.user.findFirst({
        where: {
            id: id
        },
    });

    if (!user) {
        return next(new sendError('User tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    let otp = generate_otp();

    if (user.email) {
        const reset_password = await prisma.resetPassword.create({
            data: {
                user_id: id,
                token: otp,
                email: user.email as string,
            }
        });

        sendEmail(user.email,
            "OTP untuk perubahan email comun Powered by Nearven",
            `<h4 style="color:orange;"> OTP untuk perubahan email comun Powered by Nearven </h4>
                <p> Gunakan One Time Password (OTP) : <b> ${otp} </b> untuk memverifikasi dan menyelesaikan registrasi akun anda </p> 
                <p> Jangan BERI tahu kode ini ke siapa pun, Termasuk comun, Waspada Penipuan!.</p>`,
            "html");

        return res.status(200).json(new sendResponse({}, 'Kode OTP berhasil dikirim', {}, 200));
    } else {
        return next(new sendError('Email tidak ditemukan', [], 'NOT_FOUND', 404));
    }
})

export const verifyCode = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { id } = req.user;

    const user = await prisma.user.findFirst({
        where: {
            id: id
        },
    });

    if (!user) {
        return next(new sendError('User tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const { otp } = req.body;

    const reset_password = await prisma.resetPassword.findFirst({
        where: {
            user_id: id,
            token: otp,
        },
    })

    if (!reset_password) {
        return next(new sendError('Kode OTP tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    return res.status(200).json(new sendResponse(true, 'Kode OTP berhasil ditemukan', {}, 200));
})

export const changeEmail = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { id } = req.user;

    const user = await prisma.user.findFirst({
        where: {
            id: id
        },
    });

    if (!user) {
        return next(new sendError('User tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const { otp, email } = req.body;

    const reset_password = await prisma.resetPassword.findFirst({
        where: {
            user_id: id,
            token: otp,
        },
    })

    if (!reset_password) {
        return next(new sendError('Kode OTP tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const userUpdated = await prisma.user.update({
        where: {
            id: id
        },
        data: {
            email: email
        }
    });

    await prisma.resetPassword.delete({
        where: {
            id: reset_password.id
        }
    })

    return res.status(200).json(new sendResponse({}, 'Email berhasil diubah', {}, 200));
})

export const validation = (method: string) => {
    switch (method) {
        case 'updatePassword': {
            return [
                body('old_password', 'Password lama tidak boleh kosong').notEmpty(),
                body('new_password', 'Password baru tidak boleh kosong').notEmpty(),
                body('new_password_confirmation', 'Konfirmasi password baru tidak boleh kosong').notEmpty(),
            ]
            break;
        }

        case 'verifyCode': {
            return [
                body('otp', 'Kode OTP tidak boleh kosong').notEmpty(),
            ]
        }

        case 'changeEmail': {
            return [
                body('otp', 'Kode OTP tidak boleh kosong').notEmpty(),
                body('email', 'Email tidak boleh kosong').notEmpty()
                .isEmail().withMessage('Email tidak valid'),
            ]
        }

        default: {
            return []
        }
    }
}