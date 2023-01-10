import { NextFunction, Request, Response } from "express";
import asyncHandler from "../../../middleware/async";
import { PrismaClient } from '@prisma/client';
import { sendResponse, sendError } from "../../../libraries/rest";
import { body, validationResult } from 'express-validator';
import { sendEmail } from "../../../libraries/nodemailer";
import { generate_otp } from "../../../libraries/helper";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { stringify } from "querystring";
import axios from "axios";
import path from "path";
import fs from 'fs';

const prisma = new PrismaClient()
const jwt_secret = process.env.JWT_SECRET || 'secret';
const jwt_expired = process.env.JWT_EXPIRED || '1h';

const client_id = process.env.GOOGLE_CLIENT_ID;
const client_secret = process.env.GOOGLE_CLIENT_SECRET;
const redirect_uri = process.env.GOOGLE_REDIRECT_URI;

export const loginGoogle = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (client_id === undefined || client_secret === undefined || redirect_uri === undefined) {
        return next(new sendError('Google client id, secret or redirect uri not found', [], 'NOT_FOUND', 404));
    }

    const stringFieldParams = stringify({
        client_id: client_id,
        redirect_uri: redirect_uri,
        scope: [
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
        ].join(' '), // space seperated string
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent',
    })

    const googleLoginUrl = `https://accounts.google.com/o/oauth2/v2/auth?${stringFieldParams}`

    return res.redirect(googleLoginUrl)
    // return res.json(new sendResponse(googleLoginUrl, 'Google login url', {}, 200));
})

export const callbackGoogle = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (client_id === undefined || client_secret === undefined || redirect_uri === undefined) {
        return next(new sendError('Google client id, secret or redirect uri not found', [], 'NOT_FOUND', 404));
    }

    const { code } = req.query

    if (!code) {
        return next(new sendError('Code not found', [], 'NOT_FOUND', 404));
    }

    const stringFieldParams = stringify({
        client_id: client_id,
        client_secret: client_secret,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code',
        code: code as string,
    })

    const googleTokenUrl = `https://oauth2.googleapis.com/token?${stringFieldParams}`

    const response = await fetch(googleTokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })

    const data = await response.json()

    const { access_token, refresh_token } = data

    const googleProfileUrl = `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`

    const responseProfile = await fetch(googleProfileUrl, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })

    const dataProfile = await responseProfile.json()

    const { email, name, picture, } = dataProfile

    let user: any;
    if (email) {
        user = await prisma.user.findFirst({
            where: {
                email: email
            }
        })
    } else {
        return next(new sendError('Email not found', [], 'NOT_FOUND', 404));
    }

    if (!user) {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(name, salt);

        const urlGenerateAvatar = 'https://api.multiavatar.com/' + name.replace(' ', '_') + '.svg';
        const imageAvatar = await axios.get(urlGenerateAvatar, { responseType: 'arraybuffer' });

        const avatarName = name.replace(' ', '_') + '.svg';
        const avatarPath = path.join(__dirname, '../../../../public/avatar/' + avatarName);
        const myUrl = req.protocol + '://' + req.get('host');
        const avatarUrl = myUrl + '/avatar/' + avatarName;

        if (!fs.existsSync(path.join(__dirname, '../../../../public/avatar/'))) {
            fs.mkdirSync(path.join(__dirname, '../../../../public/avatar/'));
        }

        fs.writeFile(avatarPath, imageAvatar.data, (err) => {
            if (err) {
                console.log(err);
            }
        })

        user = await prisma.user.create({
            data: {
                name: name,
                username: name,
                email: email,
                password: hash,
                avatar: picture ? picture : avatarUrl,
                otp: null,
                otp_created_at: null
            }
        })
    }

    const config = await prisma.config.findMany()

    await Promise.all(config.map(async (item) => {
        const cek = await prisma.userConfig.findFirst({
            where: {
                user_id: user.id,
                config_id: item.id
            }
        })

        if (!cek) {
            await prisma.userConfig.create({
                data: {
                    user_id: user.id,
                    config_id: item.id,
                    value: true,
                }
            })
        }
    }))

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

    // res.setHeader("Set-Cookie", `token=${token}; path=/; Max-Age=${options.expires.toUTCString()}; HttpOnly; Secure; SameSite=Strict; Domain=${process.env.FRONTEND_AUTH_URL};`);
    res.setHeader(
        "Set-Cookie",
        `token=${token}; HttpOnly; Domain=${process.env.FRONTEND_AUTH_URL
        }; SameSite=Strict; Max-Age=${jwt_expired
        }; Path=/;`
    );

    let frontend_url = 'https://' + process.env.FRONTEND_URL || 'http://localhost:3000';

    return res.redirect(frontend_url);
    // res.json(new sendResponse({
    //     user: {
    //         id: user.id,
    //         username: user.username,
    //         email: user.email,
    //         avatar: user.avatar,
    //     }, token
    // }, 'Berhasil registrasi!', {}, 200));
})