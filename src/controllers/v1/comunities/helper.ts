import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export const createRolePermission = async (group: any, owner: any) => {
    const moderator = await prisma.groupRole.create({
        data: {
            group_id: group.id,
            name: 'Moderator',
            slug: 'moderator',
            description: 'Moderator of the group',
        }
    })

    const admin = await prisma.groupRole.create({
        data: {
            group_id: group.id,
            name: 'Admin',
            slug: 'admin',
            description: 'Admin of the group',
        }
    })

    const member = await prisma.groupRole.create({
        data: {
            group_id: group.id,
            name: 'Anggota',
            slug: 'anggota',
            description: 'Anggota of the group',
        }
    })

    // Create Owner Permission
    await prisma.groupRolePermission.createMany({
        data: [
            {
                group_role_id: owner.id,
                name: "Melihat Konten",
                status: true,
                description: "Izinkan anggota untuk melihat konten",
                slug: "melihat_konten",
                label: "Konten",
            },
            {
                group_role_id: owner.id,
                name: "Posting Thread",
                status: true,
                description: "Izinkan anggota untuk posting thread",
                slug: "posting_thread",
                label: "Konten",
            },
            {
                group_role_id: owner.id,
                name: "Posting Tanya Jawab",
                status: true,
                description:
                    "Izinkan anggota untuk posting tanya jawab",
                slug: "posting_tanya_jawab",
                label: "Konten",
            },
            {
                group_role_id: owner.id,
                name: "Posting Poll",
                status: true,
                description:
                    "Izinkan anggota untuk posting polling",
                slug: "posting_poll",
                label: "Konten",
            },
            {
                group_role_id: owner.id,
                name: "Posting Video Short",
                status: true,
                description:
                    "Izinkan anggota untuk posting video short",
                slug: "posting_video_short",
                label: "Konten",
            },
            {
                group_role_id: owner.id,
                name: "Terima dan Tolak Permintaan Posting",
                status: true,
                description:
                    "Izinkan anggota untuk menerima postingan di permintaan posting",
                slug: "terima_dan_tolak_permintaan_posting",
                label: "Konten",
            },
            {
                group_role_id: owner.id,
                name: "Hapus Konten",
                status: true,
                description:
                    "Izinkan anggota untuk menghapus konten",
                slug: "hapus_konten",
                label: "Konten",
            },
            // Anggota
            {
                group_role_id: owner.id,
                name: "Terima dan Tolak Anggota",
                status: true,
                description:
                    "Izinkan anggota untuk menerima atau menolak permintaan bergabung",
                label: "Anggota",
                slug: "terima_dan_tolak_anggota",
            },
            {
                group_role_id: owner.id,
                name: "Keluarkan Anggota",
                status: true,
                description:
                    "Izinkan anggota untuk keluarkan anggota lainnya",
                label: "Anggota",
                slug: "keluarkan_anggota",
            },
            {
                group_role_id: owner.id,
                name: "Ban Anggota",
                status: true,
                description:
                    "Izinkan anggota untuk banned anggota lainnya",
                label: "Anggota",
                slug: "ban_anggota",
            },
            // Komunitas
            {
                group_role_id: owner.id,
                name: "Analitik",
                status: true,
                description:
                    "Izinkan anggota untuk melihat analitik",
                label: "Komunitas",
                slug: "analitik",
            },
            {
                group_role_id: owner.id,
                name: "Kelola Roles",
                status: true,
                description: "Izinkan anggota untuk kelola role",
                label: "Komunitas",
                slug: "kelola_roles",
            },
            {
                group_role_id: owner.id,
                name: "Pembayaran",
                status: true,
                description:
                    "Izinkan anggota untuk kelola pembayaran",
                label: "Komunitas",
                slug: "pembayaran",
            },
            {
                group_role_id: owner.id,
                name: "Navigasi",
                status: true,
                description:
                    "Izinkan anggota untuk kelola navigasi",
                label: "Komunitas",
                slug: "navigasi",
            },
            {
                group_role_id: owner.id,
                name: "Tampilan",
                status: true,
                description:
                    "Izinkan anggota untuk kelola tampilan",
                label: "Komunitas",
                slug: "tampilan",
            },
            {
                group_role_id: owner.id,
                name: "Atur Fitur",
                status: true,
                description:
                    "Izinkan anggota untuk kelola atur fitur",
                label: "Komunitas",
                slug: "atur_fitur",
            },
            {
                group_role_id: owner.id,
                name: "Pengaturan",
                status: true,
                description:
                    "Izinkan anggota untuk kelola pengaturan",
                label: "Komunitas",
                slug: "pengaturan",
            },
            {
                group_role_id: owner.id,
                name: "Kelola Komunitas",
                status: true,
                description:
                    "Izinkan anggota untuk mengelola komunitas (jika ini dimatikan tidak akan bisa melihat atau mengelola seluruh fitur pengelola komunitas seperti analitik, role, dan lainnya)",
                label: "Komunitas",
                slug: "kelola_komunitas",
            },
        ]
    })
    // Create Admin Permission
    await prisma.groupRolePermission.createMany({
        data: [
            {
                group_role_id: admin.id,
                name: "Melihat Konten",
                status: true,
                description: "Izinkan anggota untuk melihat konten",
                slug: "melihat_konten",
                label: "Konten",
            },
            {
                group_role_id: admin.id,
                name: "Posting Thread",
                status: true,
                description: "Izinkan anggota untuk posting thread",
                slug: "posting_thread",
                label: "Konten",
            },
            {
                group_role_id: admin.id,
                name: "Posting Tanya Jawab",
                status: true,
                description:
                    "Izinkan anggota untuk posting tanya jawab",
                slug: "posting_tanya_jawab",
                label: "Konten",
            },
            {
                group_role_id: admin.id,
                name: "Posting Poll",
                status: true,
                description:
                    "Izinkan anggota untuk posting polling",
                slug: "posting_poll",
                label: "Konten",
            },
            {
                group_role_id: admin.id,
                name: "Posting Video Short",
                status: true,
                description:
                    "Izinkan anggota untuk posting video short",
                slug: "posting_video_short",
                label: "Konten",
            },
            {
                group_role_id: admin.id,
                name: "Terima dan Tolak Permintaan Posting",
                status: true,
                description:
                    "Izinkan anggota untuk menerima postingan di permintaan posting",
                slug: "terima_dan_tolak_permintaan_posting",
                label: "Konten",
            },
            {
                group_role_id: admin.id,
                name: "Hapus Konten",
                status: true,
                description:
                    "Izinkan anggota untuk menghapus konten",
                slug: "hapus_konten",
                label: "Konten",
            },
            // Anggota
            {
                group_role_id: admin.id,
                name: "Terima dan Tolak Anggota",
                status: true,
                description:
                    "Izinkan anggota untuk menerima atau menolak permintaan bergabung",
                label: "Anggota",
                slug: "terima_dan_tolak_anggota",
            },
            {
                group_role_id: admin.id,
                name: "Keluarkan Anggota",
                status: true,
                description:
                    "Izinkan anggota untuk keluarkan anggota lainnya",
                label: "Anggota",
                slug: "keluarkan_anggota",
            },
            {
                group_role_id: admin.id,
                name: "Ban Anggota",
                status: true,
                description:
                    "Izinkan anggota untuk banned anggota lainnya",
                label: "Anggota",
                slug: "ban_anggota",
            },
            // Komunitas
            {
                group_role_id: admin.id,
                name: "Analitik",
                status: true,
                description:
                    "Izinkan anggota untuk melihat analitik",
                label: "Komunitas",
                slug: "analitik",
            },
            {
                group_role_id: admin.id,
                name: "Kelola Roles",
                status: true,
                description: "Izinkan anggota untuk kelola role",
                label: "Komunitas",
                slug: "kelola_roles",
            },
            {
                group_role_id: admin.id,
                name: "Pembayaran",
                status: true,
                description:
                    "Izinkan anggota untuk kelola pembayaran",
                label: "Komunitas",
                slug: "pembayaran",
            },
            {
                group_role_id: admin.id,
                name: "Navigasi",
                status: true,
                description:
                    "Izinkan anggota untuk kelola navigasi",
                label: "Komunitas",
                slug: "navigasi",
            },
            {
                group_role_id: admin.id,
                name: "Tampilan",
                status: true,
                description:
                    "Izinkan anggota untuk kelola tampilan",
                label: "Komunitas",
                slug: "tampilan",
            },
            {
                group_role_id: admin.id,
                name: "Atur Fitur",
                status: true,
                description:
                    "Izinkan anggota untuk kelola atur fitur",
                label: "Komunitas",
                slug: "atur_fitur",
            },
            {
                group_role_id: admin.id,
                name: "Pengaturan",
                status: true,
                description:
                    "Izinkan anggota untuk kelola pengaturan",
                label: "Komunitas",
                slug: "pengaturan",
            },
            {
                group_role_id: admin.id,
                name: "Kelola Komunitas",
                status: true,
                description:
                    "Izinkan anggota untuk mengelola komunitas (jika ini dimatikan tidak akan bisa melihat atau mengelola seluruh fitur pengelola komunitas seperti analitik, role, dan lainnya)",
                label: "Komunitas",
                slug: "kelola_komunitas",
            },
        ]
    })

    // Create moderator Permission
    await prisma.groupRolePermission.createMany({
        data: [
            {
                group_role_id: moderator.id,
                name: "Melihat Konten",
                status: true,
                description: "Izinkan anggota untuk melihat konten",
                slug: "melihat_konten",
                label: "Konten",
            },
            {
                group_role_id: moderator.id,
                name: "Posting Thread",
                status: true,
                description: "Izinkan anggota untuk posting thread",
                slug: "posting_thread",
                label: "Konten",
            },
            {
                group_role_id: moderator.id,
                name: "Posting Tanya Jawab",
                status: true,
                description:
                    "Izinkan anggota untuk posting tanya jawab",
                slug: "posting_tanya_jawab",
                label: "Konten",
            },
            {
                group_role_id: moderator.id,
                name: "Posting Poll",
                status: true,
                description:
                    "Izinkan anggota untuk posting polling",
                slug: "posting_poll",
                label: "Konten",
            },
            {
                group_role_id: moderator.id,
                name: "Posting Video Short",
                status: true,
                description:
                    "Izinkan anggota untuk posting video short",
                slug: "posting_video_short",
                label: "Konten",
            },
            {
                group_role_id: moderator.id,
                name: "Terima dan Tolak Permintaan Posting",
                status: true,
                description:
                    "Izinkan anggota untuk menerima postingan di permintaan posting",
                slug: "terima_dan_tolak_permintaan_posting",
                label: "Konten",
            },
            {
                group_role_id: moderator.id,
                name: "Hapus Konten",
                status: true,
                description:
                    "Izinkan anggota untuk menghapus konten",
                slug: "hapus_konten",
                label: "Konten",
            },
            // Anggota
            {
                group_role_id: moderator.id,
                name: "Terima dan Tolak Anggota",
                status: true,
                description:
                    "Izinkan anggota untuk menerima atau menolak permintaan bergabung",
                label: "Anggota",
                slug: "terima_dan_tolak_anggota",
            },
            {
                group_role_id: moderator.id,
                name: "Keluarkan Anggota",
                status: true,
                description:
                    "Izinkan anggota untuk keluarkan anggota lainnya",
                label: "Anggota",
                slug: "keluarkan_anggota",
            },
            {
                group_role_id: moderator.id,
                name: "Ban Anggota",
                status: true,
                description:
                    "Izinkan anggota untuk banned anggota lainnya",
                label: "Anggota",
                slug: "ban_anggota",
            },
            // Komunitas
            {
                group_role_id: moderator.id,
                name: "Analitik",
                status: false,
                description:
                    "Izinkan anggota untuk melihat analitik",
                label: "Komunitas",
                slug: "analitik",
            },
            {
                group_role_id: moderator.id,
                name: "Kelola Roles",
                status: false,
                description: "Izinkan anggota untuk kelola role",
                label: "Komunitas",
                slug: "kelola_roles",
            },
            {
                group_role_id: moderator.id,
                name: "Pembayaran",
                status: false,
                description:
                    "Izinkan anggota untuk kelola pembayaran",
                label: "Komunitas",
                slug: "pembayaran",
            },
            {
                group_role_id: moderator.id,
                name: "Navigasi",
                status: false,
                description:
                    "Izinkan anggota untuk kelola navigasi",
                label: "Komunitas",
                slug: "navigasi",
            },
            {
                group_role_id: moderator.id,
                name: "Tampilan",
                status: false,
                description:
                    "Izinkan anggota untuk kelola tampilan",
                label: "Komunitas",
                slug: "tampilan",
            },
            {
                group_role_id: moderator.id,
                name: "Atur Fitur",
                status: false,
                description:
                    "Izinkan anggota untuk kelola atur fitur",
                label: "Komunitas",
                slug: "atur_fitur",
            },
            {
                group_role_id: moderator.id,
                name: "Pengaturan",
                status: false,
                description:
                    "Izinkan anggota untuk kelola pengaturan",
                label: "Komunitas",
                slug: "pengaturan",
            },
            {
                group_role_id: moderator.id,
                name: "Kelola Komunitas",
                status: false,
                description:
                    "Izinkan anggota untuk mengelola komunitas (jika ini dimatikan tidak akan bisa melihat atau mengelola seluruh fitur pengelola komunitas seperti analitik, role, dan lainnya)",
                label: "Komunitas",
                slug: "kelola_komunitas",
            },
        ]
    })

    // Create member Permission
    await prisma.groupRolePermission.createMany({
        data: [
            {
                group_role_id: member.id,
                name: "Melihat Konten",
                status: true,
                description: "Izinkan anggota untuk melihat konten",
                slug: "melihat_konten",
                label: "Konten",
            },
            {
                group_role_id: member.id,
                name: "Posting Thread",
                status: true,
                description: "Izinkan anggota untuk posting thread",
                slug: "posting_thread",
                label: "Konten",
            },
            {
                group_role_id: member.id,
                name: "Posting Tanya Jawab",
                status: true,
                description:
                    "Izinkan anggota untuk posting tanya jawab",
                slug: "posting_tanya_jawab",
                label: "Konten",
            },
            {
                group_role_id: member.id,
                name: "Posting Poll",
                status: true,
                description:
                    "Izinkan anggota untuk posting polling",
                slug: "posting_poll",
                label: "Konten",
            },
            {
                group_role_id: member.id,
                name: "Posting Video Short",
                status: true,
                description:
                    "Izinkan anggota untuk posting video short",
                slug: "posting_video_short",
                label: "Konten",
            },
            {
                group_role_id: member.id,
                name: "Terima dan Tolak Permintaan Posting",
                status: false,
                description:
                    "Izinkan anggota untuk menerima postingan di permintaan posting",
                slug: "terima_dan_tolak_permintaan_posting",
                label: "Konten",
            },
            {
                group_role_id: member.id,
                name: "Hapus Konten",
                status: false,
                description:
                    "Izinkan anggota untuk menghapus konten",
                slug: "hapus_konten",
                label: "Konten",
            },
            // Anggota
            {
                group_role_id: member.id,
                name: "Terima dan Tolak Anggota",
                status: false,
                description:
                    "Izinkan anggota untuk menerima atau menolak permintaan bergabung",
                label: "Anggota",
                slug: "terima_dan_tolak_anggota",
            },
            {
                group_role_id: member.id,
                name: "Keluarkan Anggota",
                status: false,
                description:
                    "Izinkan anggota untuk keluarkan anggota lainnya",
                label: "Anggota",
                slug: "keluarkan_anggota",
            },
            {
                group_role_id: member.id,
                name: "Ban Anggota",
                status: false,
                description:
                    "Izinkan anggota untuk banned anggota lainnya",
                label: "Anggota",
                slug: "ban_anggota",
            },
            // Komunitas
            {
                group_role_id: member.id,
                name: "Analitik",
                status: false,
                description:
                    "Izinkan anggota untuk melihat analitik",
                label: "Komunitas",
                slug: "analitik",
            },
            {
                group_role_id: member.id,
                name: "Kelola Roles",
                status: false,
                description: "Izinkan anggota untuk kelola role",
                label: "Komunitas",
                slug: "kelola_roles",
            },
            {
                group_role_id: member.id,
                name: "Pembayaran",
                status: false,
                description:
                    "Izinkan anggota untuk kelola pembayaran",
                label: "Komunitas",
                slug: "pembayaran",
            },
            {
                group_role_id: member.id,
                name: "Navigasi",
                status: false,
                description:
                    "Izinkan anggota untuk kelola navigasi",
                label: "Komunitas",
                slug: "navigasi",
            },
            {
                group_role_id: member.id,
                name: "Tampilan",
                status: false,
                description:
                    "Izinkan anggota untuk kelola tampilan",
                label: "Komunitas",
                slug: "tampilan",
            },
            {
                group_role_id: member.id,
                name: "Atur Fitur",
                status: false,
                description:
                    "Izinkan anggota untuk kelola atur fitur",
                label: "Komunitas",
                slug: "atur_fitur",
            },
            {
                group_role_id: member.id,
                name: "Pengaturan",
                status: false,
                description:
                    "Izinkan anggota untuk kelola pengaturan",
                label: "Komunitas",
                slug: "pengaturan",
            },
            {
                group_role_id: member.id,
                name: "Kelola Komunitas",
                status: false,
                description:
                    "Izinkan anggota untuk mengelola komunitas (jika ini dimatikan tidak akan bisa melihat atau mengelola seluruh fitur pengelola komunitas seperti analitik, role, dan lainnya)",
                label: "Komunitas",
                slug: "kelola_komunitas",
            },
        ]
    })
}

export const createMemberPermission = async (member: any) => {
    await prisma.groupRolePermission.createMany({
        data: [
            {
                group_role_id: member.id,
                name: "Melihat Konten",
                status: true,
                description: "Izinkan anggota untuk melihat konten",
                slug: "melihat_konten",
                label: "Konten",
            },
            {
                group_role_id: member.id,
                name: "Posting Thread",
                status: true,
                description: "Izinkan anggota untuk posting thread",
                slug: "posting_thread",
                label: "Konten",
            },
            {
                group_role_id: member.id,
                name: "Posting Tanya Jawab",
                status: true,
                description:
                    "Izinkan anggota untuk posting tanya jawab",
                slug: "posting_tanya_jawab",
                label: "Konten",
            },
            {
                group_role_id: member.id,
                name: "Posting Poll",
                status: true,
                description:
                    "Izinkan anggota untuk posting polling",
                slug: "posting_poll",
                label: "Konten",
            },
            {
                group_role_id: member.id,
                name: "Posting Video Short",
                status: true,
                description:
                    "Izinkan anggota untuk posting video short",
                slug: "posting_video_short",
                label: "Konten",
            },
            {
                group_role_id: member.id,
                name: "Terima dan Tolak Permintaan Posting",
                status: false,
                description:
                    "Izinkan anggota untuk menerima postingan di permintaan posting",
                slug: "terima_dan_tolak_permintaan_posting",
                label: "Konten",
            },
            {
                group_role_id: member.id,
                name: "Hapus Konten",
                status: false,
                description:
                    "Izinkan anggota untuk menghapus konten",
                slug: "hapus_konten",
                label: "Konten",
            },
            // Anggota
            {
                group_role_id: member.id,
                name: "Terima dan Tolak Anggota",
                status: false,
                description:
                    "Izinkan anggota untuk menerima atau menolak permintaan bergabung",
                label: "Anggota",
                slug: "terima_dan_tolak_anggota",
            },
            {
                group_role_id: member.id,
                name: "Keluarkan Anggota",
                status: false,
                description:
                    "Izinkan anggota untuk keluarkan anggota lainnya",
                label: "Anggota",
                slug: "keluarkan_anggota",
            },
            {
                group_role_id: member.id,
                name: "Ban Anggota",
                status: false,
                description:
                    "Izinkan anggota untuk banned anggota lainnya",
                label: "Anggota",
                slug: "ban_anggota",
            },
            // Komunitas
            {
                group_role_id: member.id,
                name: "Analitik",
                status: false,
                description:
                    "Izinkan anggota untuk melihat analitik",
                label: "Komunitas",
                slug: "analitik",
            },
            {
                group_role_id: member.id,
                name: "Kelola Roles",
                status: false,
                description: "Izinkan anggota untuk kelola role",
                label: "Komunitas",
                slug: "kelola_roles",
            },
            {
                group_role_id: member.id,
                name: "Pembayaran",
                status: false,
                description:
                    "Izinkan anggota untuk kelola pembayaran",
                label: "Komunitas",
                slug: "pembayaran",
            },
            {
                group_role_id: member.id,
                name: "Navigasi",
                status: false,
                description:
                    "Izinkan anggota untuk kelola navigasi",
                label: "Komunitas",
                slug: "navigasi",
            },
            {
                group_role_id: member.id,
                name: "Tampilan",
                status: false,
                description:
                    "Izinkan anggota untuk kelola tampilan",
                label: "Komunitas",
                slug: "tampilan",
            },
            {
                group_role_id: member.id,
                name: "Atur Fitur",
                status: false,
                description:
                    "Izinkan anggota untuk kelola atur fitur",
                label: "Komunitas",
                slug: "atur_fitur",
            },
            {
                group_role_id: member.id,
                name: "Pengaturan",
                status: false,
                description:
                    "Izinkan anggota untuk kelola pengaturan",
                label: "Komunitas",
                slug: "pengaturan",
            },
            {
                group_role_id: member.id,
                name: "Kelola Komunitas",
                status: false,
                description:
                    "Izinkan anggota untuk mengelola komunitas (jika ini dimatikan tidak akan bisa melihat atau mengelola seluruh fitur pengelola komunitas seperti analitik, role, dan lainnya)",
                label: "Komunitas",
                slug: "kelola_komunitas",
            },
        ]
    })
}

export const myPermissionGroup = async (group: any, user_id: number, slug: string) => {
    const group_member = await prisma.groupMember.findFirst({
        where: {
            group_id: group.id,
            user_id: user_id
        },
    })

    if (!group_member) return false

    const group_role: any = await prisma.groupRole.findFirst({
        where: {
            id: group_member.group_role_id
        },
        include: {
            group_role_permissions: true
        }
    })

    if (!group_role) return false

    const permission = group_role.group_role_permissions.find((item: any) => item.slug === slug)

    if (!permission) return false

    return permission.status
}

export const joinedGroup = async (group: any, user_id: number) => {
    if (!user_id || !group) return false
    const group_member = await prisma.groupMember.findFirst({
        where: {
            group_id: group.id,
            user_id: user_id,
            status: 'joined'
        },
    })

    if (!group_member) return false

    return true
}

export const list_permission_roles = [
    {
        name: "Melihat Konten",
        status: true,
        description: "Izinkan anggota untuk melihat konten",
        slug: "melihat_konten",
        label: "Konten",
    },
    {
        name: "Posting Thread",
        status: true,
        description: "Izinkan anggota untuk posting thread",
        slug: "posting_thread",
        label: "Konten",
    },
    {
        name: "Posting Tanya Jawab",
        status: true,
        description:
            "Izinkan anggota untuk posting tanya jawab",
        slug: "posting_tanya_jawab",
        label: "Konten",
    },
    {
        name: "Posting Poll",
        status: true,
        description: "Izinkan anggota untuk posting polling",
        slug: "posting_poll",
        label: "Konten",
    },
    {
        name: "Posting Video Short",
        status: true,
        description:
            "Izinkan anggota untuk posting video short",
        slug: "posting_video_short",
        label: "Konten",
    },
    {
        name: "Terima dan Tolak Permintaan Posting",
        status: true,
        description:
            "Izinkan anggota untuk menerima postingan di permintaan posting",
        slug: "terima_dan_tolak_permintaan_posting",
        label: "Konten",
    },
    {
        name: "Hapus Konten",
        status: true,
        description: "Izinkan anggota untuk menghapus konten",
        slug: "hapus_konten",
        label: "Konten",
    },
    // Anggota
    {
        name: "Terima dan Tolak Anggota",
        status: true,
        description:
            "Izinkan anggota untuk menerima atau menolak permintaan bergabung",
        label: "Anggota",
        slug: "terima_dan_tolak_anggota",
    },
    {
        name: "Keluarkan Anggota",
        status: true,
        description:
            "Izinkan anggota untuk keluarkan anggota lainnya",
        label: "Anggota",
        slug: "keluarkan_anggota",
    },
    {
        name: "Ban Anggota",
        status: true,
        description:
            "Izinkan anggota untuk banned anggota lainnya",
        label: "Anggota",
        slug: "ban_anggota",
    },
    // Komunitas
    {
        name: "Kelola Komunitas",
        status: true,
        description:
            "Izinkan anggota untuk mengelola komunitas (jika ini dimatikan tidak akan bisa melihat atau mengelola seluruh fitur pengelola komunitas seperti analitik, role, dan lainnya)",
        label: "Komunitas",
        slug: "kelola_komunitas",
    },
    {
        name: "Analitik",
        status: true,
        description: "Izinkan anggota untuk melihat analitik",
        label: "Komunitas",
        slug: "analitik",
    },
    {
        name: "Kelola Roles",
        status: true,
        description: "Izinkan anggota untuk kelola role",
        label: "Komunitas",
        slug: "kelola_roles",
    },
    {
        name: "Pembayaran",
        status: true,
        description:
            "Izinkan anggota untuk kelola pembayaran",
        label: "Komunitas",
        slug: "pembayaran",
    },
    {
        name: "Navigasi",
        status: true,
        description: "Izinkan anggota untuk kelola navigasi",
        label: "Komunitas",
        slug: "navigasi",
    },
    {
        name: "Tampilan",
        status: true,
        description: "Izinkan anggota untuk kelola tampilan",
        label: "Komunitas",
        slug: "tampilan",
    },
    {
        name: "Atur Fitur",
        status: true,
        description:
            "Izinkan anggota untuk kelola atur fitur",
        label: "Komunitas",
        slug: "atur_fitur",
    },
    {
        name: "Pengaturan",
        status: true,
        description:
            "Izinkan anggota untuk kelola pengaturan",
        label: "Komunitas",
        slug: "pengaturan",
    },
];