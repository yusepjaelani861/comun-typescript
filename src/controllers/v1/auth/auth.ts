import { NextFunction, Request, Response } from "express";
import asyncHandler from "../../../middleware/async";
import { OtpType, PrismaClient } from '@prisma/client';
import { sendResponse, sendError } from "../../../libraries/rest";
import { body, validationResult } from 'express-validator';
import { sendEmail, sendOTPWhatsapp, sendSMSZenziva } from "../../../libraries/nodemailer";
import { generate_otp } from "../../../libraries/helper";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import fs from 'fs';
import path from "path";


const prisma = new PrismaClient()
const jwt_secret = process.env.JWT_SECRET || 'secret';
const jwt_expired = process.env.JWT_EXPIRED || '1h';

const register = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Invalid request', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { type } = req.params;

    let { email, phone, sms, country_code } = req.body;

    let ip: any = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (ip && ip.includes(',')) {
        ip = ip.split(',')[0];
    }

    let device: any = req.headers['user-agent'];
    const otp = generate_otp();
    let cek_user: any, where: any = {};

    switch (type) {
        case 'email':
            if (!email) {
                return next(new sendError('Email tidak boleh kosong', [
                    {
                        param: 'email',
                        msg: 'Email tidak boleh kosong'
                    }
                ], 'VALIDATION_ERROR', 422));
            }

            where = {
                email: email
            }
            break;
        case 'phone':
            if (!phone) {
                return next(new sendError('Phone tidak boleh kosong', [
                    {
                        param: 'phone',
                        msg: 'Phone tidak boleh kosong'
                    }
                ], 'VALIDATION_ERROR', 422));
            }

            if (!country_code) {
                return next(new sendError('Country code tidak boleh kosong', [
                    {
                        param: 'country_code',
                        msg: 'Country code tidak boleh kosong'
                    }
                ], 'VALIDATION_ERROR', 422));
            }

            if (phone.includes('+')) {
                phone = phone.replace('+', '')
            }

            if (phone.charAt(2) === '0') {
                phone = phone.replace('0', '')
            }

            where = {
                phonenumber: phone,
                country_code: country_code,
            }

            break;
        default:
            return next(new sendError('Invalid type', [], 'PROCESS_ERROR', 400));
            break;
    }

    cek_user = await prisma.user.findFirst({
        where: where,
        orderBy: {
            id: 'desc'
        }
    })

    if (type === 'email' && cek_user && cek_user.username !== null && cek_user.password !== null || type === 'phone' && cek_user && cek_user.username !== null && cek_user.phonenumber) {
        return next(new sendError('Email atau nomor telepon sudah terdaftar', [], 'PROCESS_ERROR', 400));
    } else if (type === 'email' && cek_user && cek_user.password === null || type === 'phone' && cek_user) {
        cek_user = cek_user;
    } else if (!cek_user) {
        cek_user = await prisma.user.create({
            data: where,
        })

        const { insert } = require('../../../database/chat');

        // Insert to service chat
        await insert('User', {...where,
            id: cek_user.id,
            created_at: new Date(),
            updated_at: new Date()
        })
    }

    // total otp dalam 1 hari lebih dari 5x, maka error
    let cek_otp = await prisma.otp.findMany({
        where: {
            user_id: cek_user.id,
            type: 'register',
            created_at: {
                gte: new Date(new Date().setHours(0, 0, 0, 0))
            },
        },
        orderBy: {
            id: 'desc'
        }
    })

    if (cek_otp.length >= 1) {
        let last_otp = cek_otp[cek_otp.length - 1];
        let last_otp_date = new Date(last_otp.created_at);
        // next otp 5 jam setelah 5x request
        if (cek_otp.length >= 5) {
            let next_otp_date = new Date(last_otp_date.setHours(last_otp_date.getHours() + 5));

            if (new Date() < next_otp_date) {
                return res.json(new sendResponse(cek_user, 'Berhasil melanjutkan pendaftaran', {}, 200))
            }
        }

        // next otp 1 menit
        let next_otp_date_1_min = new Date(last_otp_date.setMinutes(last_otp_date.getMinutes() + 1));
        if (new Date() < next_otp_date_1_min) {
            return res.json(new sendResponse(cek_user, 'Berhasil melanjutkan pendaftaran', {}, 200))
        }
    }

    let otpCreate = await prisma.otp.create({
        data: {
            user_id: cek_user.id,
            otp: otp,
            ip: ip,
            device: device,
            type: 'register'
        }
    })

    if (type === 'email') {
        sendEmail(email,
            "OTP untuk comun Poweered by Nearven",
            `<p> Kode OTP Comun anda adalah : <strong>${otp}</strong>. kode ini hanya berlaku 10 menit </p>`,
            "html");
    }

    if (type === 'phone') {
        if (sms === true) {
            await sendSMSZenziva(phone, otp);
        } else {
            await sendOTPWhatsapp(phone, otp);
        }
    }

    return res.json(new sendResponse(cek_user, 'Berhasil registrasi', {}, 200))
})

const check_username = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Invalid request', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { username } = req.body;

    let cek_user = await prisma.user.findFirst({
        where: {
            username: username
        }
    })

    if (cek_user) {
        return res.json(new sendResponse(false, 'Nama pengguna tidak tersedia, gunakan yang lain', {}, 200))
    }

    return res.json(new sendResponse(true, 'Username tersedia', {}, 200))
})

const cek_otp = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Invalid request', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const {
        otp,
        id,
        type,
    } = req.body;

    let cek_user = await prisma.user.findFirst({
        where: {
            id: id
        }
    })

    if (!cek_user) {
        return next(new sendError('User tidak ditemukan', [], 'PROCESS_ERROR', 400));
    }

    let cek_otp = await prisma.otp.findFirst({
        where: {
            otp: otp,
            user_id: id,
            type: type
        },
        orderBy: {
            id: 'desc'
        }
    })

    if (!cek_otp) {
        return res.json(new sendResponse(false, 'OTP salah', {}, 200));
    }

    // if otp < 10 minutes, then error
    let date = new Date();
    let date_otp = new Date(cek_otp.created_at);
    let diff = (date.getTime() - date_otp.getTime()) / 1000;
    diff /= 60;
    let minutes = Math.abs(Math.round(diff));

    if (minutes > 10) {
        return res.json(new sendResponse(false, 'OTP kadaluarsa', {}, 200));
    }

    return res.json(new sendResponse({}, 'OTP benar', {}, 200));
})

const send_otp = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Invalid request', errors.array(), 'VALIDATION_ERROR', 422));
    }

    let ip: any = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (ip && ip.includes(',')) {
        ip = ip.split(',')[0];
    }
    let device: any = req.headers['user-agent'];

    let {
        id,
        phone,
        type,
        sms,
    } = req.body;

    if (type === 'register') {
        if (!id) {
            return next(new sendError('ID harus diisi', [
                {
                    param: 'id',
                    msg: 'ID harus diisi'
                }
            ], 'VALIDATION_ERROR', 422));
        }
    }

    if (type === 'login') {
        if (!phone) {
            return next(new sendError('Nomor telepon harus diisi', [
                {
                    param: 'phone',
                    msg: 'Nomor telepon harus diisi'
                }
            ], 'VALIDATION_ERROR', 422));
        }

        if (phone.includes('+')) {
            phone = phone.replace('+', '');
        }

        id = phone
    }

    const response = await OTPSend(id, type, ip, device, sms);
    if (response.status === false) {
        return next(new sendError(response.message, [], 'PROCESS_ERROR', 400));
    }


    return res.json(new sendResponse({}, 'OTP berhasil dikirim', {}, 200));
})

const OTPSend = async (id: any, type_otp: OtpType, ip: any, device: any, sms: boolean = false) => {
    let where: any = {};
    if (type_otp === 'login') {
        where = {
            phonenumber: id
        }
    } else {
        where = {
            id: id
        }
    }
    let cek_user = await prisma.user.findFirst({
        where: where,
    })

    if (!cek_user) {
        return {
            status: false,
            message: 'User tidak ditemukan'
        }
    }

    let type: any;
    if (cek_user.email) {
        type = 'email'
    }
    if (cek_user.phonenumber) {
        type = 'phone'
    }

    let cek_otp_banyak = await prisma.otp.findMany({
        where: {
            user_id: cek_user.id,
            type: type_otp,
        },
        orderBy: {
            created_at: 'desc'
        },
    })

    if (cek_otp_banyak.length >= 1) {
        let last_otp = cek_otp_banyak[cek_otp_banyak.length - 1];
        let last_otp_date = new Date(last_otp.created_at);
        // next otp 5 jam setelah 5x request
        if (cek_otp_banyak.length >= 5) {
            let next_otp_date = new Date(last_otp_date.setHours(last_otp_date.getHours() + 5));
    
            // if (new Date() < next_otp_date) {
            //     return {
            //         status: false,
            //         message: 'Anda sudah mencapai batas maksimal untuk mengirim OTP, silahkan lakukan kembali setelah 5 jam'
            //     }
            // }
        }
    
        // next otp 1 menit
        let cek_otp_latest = await prisma.otp.findFirst({
            where: {
                user_id: cek_user.id,
                type: type_otp,
            },
            orderBy: {
                created_at: 'desc'
            },
        })

        if (!cek_otp_latest) {
            return {
                status: false,
                message: 'OTP tidak ditemukan'
            }
        }

        let next_otp_date = new Date(cek_otp_latest.created_at);
        // return {
        //     status: false,
        //     message: next_otp_date.toString() + ' ' + new Date().toString()
        // }
        if (new Date() < next_otp_date) {
            return {
                status: false,
                message: 'Anda sudah mencapai batas maksimal untuk mengirim OTP, silahkan lakukan kembali setelah 1 menit'
            }
        }
    }

    let otp = generate_otp();

    await prisma.otp.create({
        data: {
            otp: otp,
            user_id: cek_user.id,
            type: type_otp,
            ip: ip,
            device: device,
        }
    })

    if (type === 'email' && cek_user.email !== null) {
        sendEmail(cek_user.email, otp);
    }

    if (type === 'phone' && cek_user.phonenumber !== null) {
        if (sms === true) {
            await sendSMSZenziva(cek_user.phonenumber, otp);
        } else {
            await sendOTPWhatsapp(cek_user.phonenumber, otp);
        }
    }

    return {
        status: true,
        message: 'OTP berhasil dikirim'
    }
}

const verify_and_update = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Invalid request', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const {
        id,
        username,
        password,
        otp,
    } = req.body;

    let cek_user = await prisma.user.findFirst({
        where: {
            id: id
        }
    })

    if (!cek_user) {
        return next(new sendError('User tidak ditemukan', [], 'PROCESS_ERROR', 400));
    }



    let otp_check = await prisma.otp.findFirst({
        where: {
            user_id: cek_user.id,
            otp: otp,
            type: 'register',
        },
        orderBy: {
            id: 'desc'
        }
    })

    if (!otp_check) {
        return next(new sendError('OTP tidak ditemukan', [], 'PROCESS_ERROR', 400));
    }

    let otp_date = new Date(otp_check.created_at);
    let next_otp_date = new Date(otp_date.setMinutes(otp_date.getMinutes() + 10));
    if (new Date() > next_otp_date) {
        return next(new sendError('OTP telah kadaluarsa', [], 'PROCESS_ERROR', 400));
    }

    let hash: any = null;
    if (cek_user.email !== null) {
        const salt = await bcrypt.genSalt(10);
        hash = await bcrypt.hash(password, salt);
    }

    let cek_username = await prisma.user.findFirst({
        where: {
            username: username
        }
    })

    if (cek_username) {
        return next(new sendError('Username sudah dipakai', [], 'PROCESS_ERROR', 400));
    }

    const urlGenerateAvatar = 'https://api.multiavatar.com/' + username + '.png?apikey=' + process.env.MULTIAVATAR_API_KEY;
    const imageAvatar = await axios.get(urlGenerateAvatar, { responseType: 'arraybuffer' });

    const avatarName = username + '.svg';
    const avatarPath = path.join(__dirname, '../../../../public/avatar/' + avatarName);
    const myUrl = req.protocol + '://' + req.get('host');
    const avatar = myUrl + '/avatar/' + avatarName;

    if (!fs.existsSync(path.join(__dirname, '../../../../public/avatar/'))) {
        fs.mkdirSync(path.join(__dirname, '../../../../public/avatar/'));
    }

    fs.writeFile(avatarPath, imageAvatar.data, (err) => {
        if (err) {
            console.log(err);
        }
    })

    let update_user = await prisma.user.update({
        where: {
            id: id
        },
        data: {
            username: username,
            avatar: avatar,
            password: cek_user.email ? hash : null,
        }
    })

    const { update } = require('../../../database/chat');


    // Update user chat
    update('User',{
        username: username,
        avatar: avatar,
        password: hash ?? null
    }, {
        id: id
    })

    const config = await prisma.config.findMany()
    await Promise.all(config.map(async (item) => {
        const cek = await prisma.userConfig.findFirst({
            where: {
                user_id: update_user.id,
                config_id: item.id
            }
        })

        if (!cek) {
            await prisma.userConfig.create({
                data: {
                    user_id: update_user.id,
                    config_id: item.id,
                    value: true,
                }
            })
        }
    }))


    let otps = await prisma.otp.deleteMany({
        where: {
            user_id: cek_user.id,
            type: 'register',
        }
    })

    const token = jwt.sign({ id: update_user.id }, jwt_secret, {
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

    // res.setHeader("Set-Cookie", `token=${token}; path=/; Max-Age=${options.expires.toUTCString()}; HttpOnly; Secure; SameSite=Strict; Domain=${process.env.FRONTEND_AUTH_URL};`);
    res.setHeader(
        "Set-Cookie",
        `token=${token}; HttpOnly; Domain=${process.env.FRONTEND_AUTH_URL
        }; SameSite=Strict; Max-Age=${jwt_expired
        }; Path=/;`
    );

    return res.json(new sendResponse({
        user: {
            id: update_user.id,
            username: update_user.username,
            email: update_user.email,
            phonenumber: update_user.phonenumber,
            avatar: update_user.avatar,
        },
        token: token,
    }, 'Berhasil menyelesaikan registrasi', {}, 200));
})

const login = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Invalid request', errors.array(), 'VALIDATION_ERROR', 422));
    }

    let ip: any = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (ip && ip.includes(',')) {
        ip = ip.split(',')[0];
    }
    let device: any = req.headers['user-agent'];

    const { type } = req.params;

    let {
        user,
        password,
        phone,
        country_code,
        sms,
        otp,
    } = req.body;

    let cek_user: any, where: any = {};
    switch (type) {
        case 'email':
            if (!user) {
                return next(new sendError('User tidak boleh kosong', [
                    {
                        param: 'user',
                        msg: 'User tidak boleh kosong'
                    }
                ], 'VALIDATION_ERROR', 422));
            }

            if (!password) {
                return next(new sendError('Password tidak boleh kosong', [
                    {
                        param: 'password',
                        msg: 'Password tidak boleh kosong'
                    }
                ], 'VALIDATION_ERROR', 422));
            }

            where = {
                OR: [
                    {
                        email: user
                    },
                    {
                        username: user
                    }
                ]
            }
            break;
        case 'phone':
            if (!phone) {
                return next(new sendError('Invalid request', [
                    {
                        param: 'phone',
                        msg: 'Phone tidak boleh kosong'
                    }
                ], 'VALIDATION_ERROR', 422));
            }

            if (!country_code) {
                return next(new sendError('Invalid request', [
                    {
                        param: 'country_code',
                        msg: 'Country code tidak boleh kosong'
                    }
                ], 'VALIDATION_ERROR', 422));
            }

            if (!otp) {
                return next(new sendError('Invalid request', [
                    {
                        param: 'otp',
                        msg: 'OTP tidak boleh kosong'
                    }
                ], 'VALIDATION_ERROR', 422));
            }

            if (phone.includes('+')) {
                phone = phone.replace('+', '');
            }

            where = {
                phonenumber: phone,
                country_code: country_code
            }
            break;
        default:
            return next(new sendError('Invalid request', [], 'PROCESS_ERROR', 400));
            break;
    }

    cek_user = await prisma.user.findFirst({
        where: where
    })

    if (!cek_user) {
        return next(new sendError('User tidak ditemukan', [], 'PROCESS_ERROR', 400));
    }

    if (type === 'email') {
        const isMatch = await bcrypt.compare(password, cek_user.password);
        if (!isMatch) {
            return next(new sendError('Username/Email atau Password salah', [], 'PROCESS_ERROR', 400));
        }
    }

    if (type === 'phone') {
        const cek_otp = await prisma.otp.findFirst({
            where: {
                user_id: cek_user.id,
                otp: otp,
                type: 'login',
            },
            orderBy: {
                id: 'desc'
            }
        })

        if (!cek_otp) {
            return next(new sendError('OTP salah', [], 'PROCESS_ERROR', 400));
        }

        // jika otp lebih dari 10 menit, maka error
        const date = new Date();
        const date_now = date.getTime();
        const date_otp = new Date(cek_otp.created_at).getTime();
        const diff = date_now - date_otp;
        const diff_minutes = Math.floor(diff / 1000 / 60);

        if (diff_minutes > 10) {
            return next(new sendError('OTP sudah kadaluarsa', [], 'PROCESS_ERROR', 400));
        }
    }

    const otps = await prisma.otp.deleteMany({
        where: {
            user_id: cek_user.id,
            type: 'login',
        }
    })

    const token = jwt.sign({ id: cek_user.id }, jwt_secret, {
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

    // res.setHeader("Set-Cookie", `token=${token}; path=/; Max-Age=${options.expires.toUTCString()}; HttpOnly; Secure; SameSite=Strict; Domain=${process.env.FRONTEND_AUTH_URL};`);
    res.setHeader(
        "Set-Cookie",
        `token=${token}; HttpOnly; Domain=${process.env.FRONTEND_AUTH_URL
        }; SameSite=Strict; Max-Age=${jwt_expired
        }; Path=/;`
    );

    return res.json(new sendResponse({
        user: {
            id: cek_user.id,
            username: cek_user.username,
            email: cek_user.email,
            phonenumber: cek_user.phonenumber,
            avatar: cek_user.avatar,
        },
        token: token,
    }, 'Berhasil login', {}, 200));
})

const logout = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
        "Set-Cookie",
        `token=; HttpOnly; Domain=${process.env.FRONTEND_AUTH_URL
        }; SameSite=Strict; Max-Age=0; Path=/;`
    );

    return res.json(new sendResponse({}, 'Berhasil logout', {}, 200));
})

const validation = (method: string) => {
    switch (method) {
        case 'cek_otp': {
            return [
                body('otp', 'OTP harus diisi').notEmpty(),
                body('type', 'Type harus diisi').notEmpty().isIn(['register', 'login', 'forgot_password']).withMessage('Type harus register, login, atau forgot_password'),
                body('id', 'ID harus diisi').notEmpty(),
            ]
        }

        case 'send_otp': {
            return [
                body('type', 'Type OTP harus diisi').notEmpty().isIn(['register', 'login', 'forgot_password']).withMessage('Type harus register, login, atau forgot_password'),
                body('id').optional(),
                body('sms').optional().isBoolean().withMessage('SMS harus boolean'),
            ]
        }

        case 'verify_and_update': {
            return [
                body('id', 'ID harus diisi').notEmpty(),
                body('username', 'Username harus diisi').notEmpty()
                .isLength({ min: 5 }).withMessage("Username minimal 5 karakter.")
                .matches(/^[a-zA-Z0-9_]+$/).withMessage("Username hanya boleh huruf, angka, dan underscore."),
                body('password', 'Password harus diisi').custom(async (value, { req }) => {
                    const cek_user = await prisma.user.findFirst({
                        where: {
                            id: req.body.id
                        }
                    })

                    if (!cek_user) {
                        throw new Error('User tidak ditemukan');
                    }

                    if (cek_user.email) {
                        if (!req.body.password) {
                            throw new Error('Password harus diisi');
                        }
                    }

                    if (req.body.password) {
                        if (req.body.password.length < 5) {
                            throw new Error('Password harus minimal 5 karakter');
                        }
                    }

                    if (req.body.password) {
                        if (!req.body.password.match(/\d/)) {
                            throw new Error('Password harus memiliki angka');
                        }
                    }
                })
            ]
        }

        case 'login': {
            return [
                body('user').optional(),
                body('password').custom(async (value, { req }) => {
                    if (req.body.user) {
                        if (!value) {
                            throw new Error('Password harus diisi');
                        }
                    }
                }),
                body('phone').optional(),
                body('sms').optional().isBoolean().withMessage('SMS harus tipe boolean'),
            ]
        }

        case 'check_username': {
            return [
                body('username', 'Username harus diisi').notEmpty()
                .isLength({ min: 5 }).withMessage("Username minimal 5 karakter.")
                .matches(/^[a-zA-Z0-9_]+$/).withMessage("Username hanya boleh huruf, angka, dan underscore.")
            ]
        }

        default: {
            return []
        }
    }
}

export {
    verify_and_update,
    login,
    register,
    cek_otp,
    send_otp,
    validation,
    logout,
    check_username,
}