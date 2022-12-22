import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    await prisma.config.createMany({
        data: [
            {
                name: 'Mode Gelap',
                label: 'dark_mode',
            },
            {
                name: 'Komentar',
                label: 'notification_comment',
            },
            {
                name: 'Mengikuti Anda',
                label: 'notification_following',
            },
            {
                name: 'Suka',
                label: 'notification_like',
            }
        ]
    })
}

main()
    .catch(e => {
        throw e
    })

    .finally(async () => {
        await prisma.$disconnect()
    })
