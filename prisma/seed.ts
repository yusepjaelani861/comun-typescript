import { PrismaClient } from "@prisma/client";
import banks from "./config/bank.json";
import ewallets from "./config/ewallet.json";

const prisma = new PrismaClient();

async function main() {
    await prisma.config.createMany({
        data: [
            {
                name: 'Mode Gelap',
                label: 'dark_mode',
                type: 'Appearance',
            },
            {
                name: 'Komentar',
                label: 'notification_comment',
                type: 'Notification',
            },
            {
                name: 'Mengikuti Anda',
                label: 'notification_following',
                type: 'Notification',
            },
            {
                name: 'Suka',
                label: 'notification_like',
                type: 'Notification',
            }
        ]
    })

    let bank: any = banks;
    let ewallet: any = ewallets;

    let data: Array<any> = [];
    for (let key in bank) {
        data.push({
            name: bank[key],
            code: key,
            icon: '',
            type: 'bank'
        })
    }

    for (var key in ewallet) {
        data.push({
            name: ewallet[key],
            code: key,
            icon: '',
            type: 'ewallet'
        })
    }

    await prisma.methodPayment.createMany({
        data: data
    })
}

main()
    .catch(e => {
        throw e
    })

    .finally(async () => {
        await prisma.$disconnect()
    })
