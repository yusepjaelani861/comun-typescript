import { Request, Response } from "express";
import asyncHandler from "../../../middleware/async";
import { PrismaClient } from '@prisma/client';
import { sendResponse, sendError } from "../../../libraries/rest";
import { body, validationResult } from 'express-validator';
import { sendEmail } from "../../../libraries/nodemailer";
import { generate_otp } from "../../../libraries/helper";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient()
const jwt_secret = process.env.JWT_SECRET || 'secret';
const jwt_expired = process.env.JWT_EXPIRED || '1h';

export const register_email = asyncHandler(async (req: Request, res: Response, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }
    const { email } = req.body;
    const check = await prisma.user.findFirst({
        where: {
            email: email
        }
    })

    if (check) {
        return next(new sendError('Email sudah terdaftar!', [], 'VALIDATION_ERROR', 400));
    }

    const user = await prisma.user.create({
        data: {
            email: email,
        }
    })

    res.status(200).json(new sendResponse(user, 'Berhasil registrasi!', {}, 200));
})

export const send_otp = asyncHandler(async (req: Request, res: Response, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error.', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { user_id } = req.body;

    const user = await prisma.user.findFirst({
        where: {
            id: user_id
        }
    })

    if (!user) {
        return next(new sendError('User tidak ditemukan', [], 'PROCESS_ERROR', 400));
    }

    let otp = generate_otp();

    await prisma.user.update({
        where: {
            id: user_id
        },
        data: {
            otp: otp,
            otp_created_at: new Date()
        }
    })


    if (!user.email) {
        return next(new sendError('Email tidak ditemukan', [], 'PROCESS_ERROR', 400));
    }

    sendEmail(user.email,
        "OTP untuk comun Poweered by Nearven",
        `<h4 style="color:orange;"> OTP untuk comun Powered by Nearven </h4>
            <p> Gunakan One Time Password (OTP) : <b> ${otp} </b> untuk memverifikasi dan menyelesaikan registrasi akun anda </p> 
            <p> Jangan BERI tahu kode ini ke siapa pun, Termasuk comun, Waspada Penipuan!.</p>`,
        "html");

    res.status(200).json(new sendResponse({}, 'Berhasil mengirim OTP!', {}, 200));
})

export const check_otp = asyncHandler(async (req: Request, res: Response, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { user_id, otp } = req.body;

    const user = await prisma.user.findFirst({
        where: {
            id: user_id,
            otp: otp.toString()
        }
    })

    let check = !user ? false : true;

    res.json(new sendResponse({ otp: check }, check ? 'OTP benar!' : 'OTP salah!', {}, 200));
})

export const check_username = asyncHandler(async (req: Request, res: Response, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { username } = req.body;

    const user = await prisma.user.findFirst({
        where: {
            username: username
        }
    })

    let check = !user ? false : true;

    res.json(new sendResponse({ check }, check ? 'Username sudah terdaftar!' : 'Username dapat dipakai!', {}, 200));
})

export const verify_and_update = asyncHandler(async (req: Request, res: Response, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { username, password, user_id, avatar } = req.body;

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    var user = await prisma.user.update({
        where: {
            id: user_id
        },
        data: {
            name: username,
            username: username,
            password: hash,
            avatar: avatar ? avatar : `https://ui-avatars.com/api/?name=${username}&background=0D8ABC&color=fff&size=128`,
            otp: null,
            otp_created_at: null
        }
    })

    const token = jwt.sign({ id: user.id }, jwt_secret, {
        expiresIn: jwt_expired
    });

    var options = {
        expires: new Date(Date.now() + Number(jwt_expired) * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: false,
    }

    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
    }

    res.setHeader("Set-Cookie", `token=${token}; path=/; Max-Age=${options.expires.toUTCString()}; HttpOnly; Secure; SameSite=Strict; Domain=${process.env.FRONTEND_AUTH_URL};`);

    res.json(new sendResponse({
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
        }, token
    }, 'Berhasil registrasi!', {}, 200));
})

export const login_email = asyncHandler(async (req: Request, res: Response, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error.', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { email, password } = req.body;

    const user = await prisma.user.findFirst({
        where: {
            email: email
        }
    })

    if (!user) {
        return next(new sendError('Email atau password salah.', [], 'PROCESS_ERROR', 400));
    }

    const isMatch = await bcrypt.compare(password, user.password as string);

    if (!isMatch) {
        return next(new sendError('Email atau password salah.', [], 'PROCESS_ERROR', 400));
    }

    const token = jwt.sign({ id: user.id }, jwt_secret, {
        expiresIn: jwt_expired
    });

    res.setHeader(
        "Set-Cookie",
        `token=${token}; HttpOnly; Domain=${
          process.env.FRONTEND_AUTH_URL
        }; SameSite=Strict; Max-Age=${
            jwt_expired
        }; Path=/;`
      );

    res.json(new sendResponse({
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
        }, token
    }, 'Berhasil login!', {}, 200));
})

export const logout = asyncHandler(async (req: Request, res: Response, next: any) => {
    res.setHeader("Set-Cookie", `token=; path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict; Domain=${process.env.FRONTEND_AUTH_URL};`);

    res.json(new sendResponse({}, 'Berhasil logout!', {}, 200));
})

export const validation = (method: string) => {
    switch (method) {
        case 'register_email': {
            return [
                body("email")
                    .isLength({ min: 5 })
                    .withMessage("Email minimal 5 karakter.")
                    .isEmail()
                    .withMessage("Silahkan masukkan format email dengan benar.")
            ]
            break;
        }

        case 'send_otp': {
            return [
                body("user_id")
                    .isLength({ min: 1 })
                    .withMessage("Pengguna tidak ditemukan.")
            ]
            break;
        }

        case 'check_otp': {
            return [
                body("user_id")
                    .isLength({ min: 1 })
                    .withMessage("Pengguna tidak ditemukan."),
                body("otp")
                    .isLength({ min: 1 })
                    .withMessage("Otp tidak ditemukan.")
            ]
            break;
        }

        case 'check_username': {
            return [
                body("username")
                    .isLength({ min: 1 })
                    .withMessage("Username tidak ditemukan.")
            ]
            break;
        }

        case 'verify_and_update': {
            return [
                body("user_id")
                    .isLength({ min: 1 })
                    .withMessage("Pengguna tidak ditemukan.")
                    .custom(async (value) => {
                        if (value) {
                            let user = await prisma.user.findFirst({
                                where: {
                                    id: value
                                }
                            });

                            if (!user) {
                                throw new Error("Pengguna tidak ditemukan.");
                            }
                        }
                        return true;
                    }),
                body("otp")
                    .isLength({ min: 1 })
                    .withMessage("OTP salah.")
                    .custom(async (value, { req }) => {
                        if (value) {
                            let user = await prisma.user.findFirst({
                                where: {
                                    id: req.body.user_id,
                                    otp: value.toString(),
                                },
                            });

                            if (!user) {
                                throw new Error("OTP salah.");
                            }
                        }
                        return true;
                    }),
                body("username")
                    .isLength({ min: 5 })
                    .withMessage("Username minimal 5 karakter.")
                    .custom(async (value) => {
                        if (value) {
                            let user = await prisma.user.findFirst({
                                where: {
                                    username: value,
                                },
                            });

                            if (user) {
                                throw new Error("Silahkan masukan username lain.");
                            }
                        }
                        return true;
                    }),
                body("password")
                    .isLength({ min: 5 })
                    .withMessage("Password harus mempunyai minimal 5 Karakter")
                    .matches(/\d/)
                    .withMessage("Password harus mempunyai angka"),
            ]
            break;
        }

        case 'login_email': {
            return [
                body("email")
                    .isLength({ min: 5 })
                    .withMessage("Email minimal 5 karakter.")
                    .isEmail()
                    .withMessage("Silahkan masukkan format email dengan benar."),
                body("password")
                    .isLength({ min: 5 })
                    .withMessage("Password harus mempunyai minimal 5 Karakter")
                    .matches(/\d/)
                    .withMessage("Password harus mempunyai angka"),
            ]
            break;
        }

        default: {
            return [];
            break;
        }
    }
}