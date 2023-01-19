import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

dotenv.config();

export const sendEmail = async (to: string, subject: string = 'Hello', body: string = 'Hello world!', body_type: string = 'html') => {
    let transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT),
        secure: false,
        auth: {
            user: process.env.MAIL_USERNAME,
            pass: process.env.MAIL_PASSWORD,
        },
    });

    let mail_config: any = {};

    if (body_type == 'html') {
        mail_config = {
            from: process.env.MAIL_FROM_NAME + ' <' + process.env.MAIL_FROM_ADDRESS + '>',
            to: to,
            subject: subject,
            html: body,
        }
    } else {
        mail_config = {
            from: process.env.MAIL_FROM_NAME + ' <' + process.env.MAIL_FROM_ADDRESS + '>',
            to: to,
            subject: subject,
            text: body,
        }
    }

    let info = await transporter.sendMail(mail_config);
    console.log('Message sent: %s', info.messageId);

    return info;
}

export const sendOTPWhatsapp = async (to: string, otp: string) => {
    const url = process.env.WHATSAPP_API_URL || ''
    await axios.post(url, {
        number: to + '@c.us',
        message: `Kode OTP Comun anda adalah : *${otp}*. kode ini hanya berlaku 10 menit`
    }, {
        headers: {
            'Accept': 'application/json'
        }
    })
}

export const sendSMSZenziva = async (to: string, otp: string) => {
    const userKey = process.env.ZENZIVA_SMS_USER_KEY || ''
    const passKey = process.env.ZENZIVA_SMS_PASS_KEY || ''

    const url = 'https://console.zenziva.net/reguler/api/sendsms/';

    const response = await axios.post(url, {
        userkey: userKey,
        passkey: passKey,
        to: to,
        message: `Kode OTP Comun anda adalah : ${otp}. kode ini hanya berlaku 10 menit`
    })

    // if (!fs.existsSync(path.join(__dirname, `../public/sms/${to}.json`))) {
    //     fs.writeFileSync(path.join(__dirname, `../public/sms/${to}.json`), JSON.stringify(response.data))
    // }
    fs.writeFileSync(path.join(__dirname, `../../public/sms/${to}.json`), JSON.stringify(response.data))
}