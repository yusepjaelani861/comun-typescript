import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

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