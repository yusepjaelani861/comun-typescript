import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import axios from 'axios';

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
        message: `*OTP untuk comun Powered by Nearven*\n\nGunakan One Time Password (OTP) : *${otp}* untuk memverifikasi dan menyelesaikan registrasi akun anda\n\nJangan beri tahu kode ini ke siapa pun, termasuk pihak comun, Waspadai Penipuan!.`
    }, {
        headers: {
            'Accept': 'application/json'
        }
    })   
}