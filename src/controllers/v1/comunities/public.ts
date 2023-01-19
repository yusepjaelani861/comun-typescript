import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import asyncHandler from "../../../middleware/async";
import { sendError, sendResponse } from "../../../libraries/rest";
import { body, validationResult } from "express-validator";
import { createMemberPermission, createRolePermission, joinedGroup, myPermissionGroup } from "./helper";
import { pagination } from "../../../libraries/helper";
import { navigation } from "./navigation_public";

const prisma = new PrismaClient();

export const checkComunityID = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { slug } = req.body;

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    return res.status(200).json(new sendResponse(group ? true : false, group ? 'Comun ID telah digunakan' : 'Comun ID tersedia', {}, 200));
})

export const viewComunity = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { slug } = req.params;

    const group: any = await prisma.group.findFirst({
        where: {
            slug: slug,
        },
        include: {
            group_members: {
                include: {
                    group_role: true,
                },
                where: {
                    status: 'joined'
                }
            },
            group_posts: {
                where: {
                    content_type: {
                        not: 'answer_question'
                    }
                }
            },
            group_roles: true,
        }
    })

    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const my_member = await prisma.groupMember.findFirst({
        where: {
            user_id: req.user?.id,
            group_id: group.id
        }
    })
    group.is_status = 'not_member';
    if (my_member) {
        group.is_status = my_member.status;
    }
    group.is_member = await joinedGroup(group, req.user?.id) ?? false;
    group.has_kelola = false;
    const member_role = await prisma.groupMember.findFirst({
        where: {
            group_id: group.id,
            user_id: req.user?.id
        },
    })

    if (!member_role) {
        group.has_kelola = false;
    }

    if (member_role) {
        const member_role_permission = await prisma.groupRolePermission.findMany({
            where: {
                group_role_id: member_role?.group_role_id
            },
        })

        member_role_permission.forEach((item: any) => {
            if (item?.status === true) {
                let dataNav = navigation(item?.slug);

                if (dataNav.length > 0) {
                    group.has_kelola = true;
                }
            }
        })
    }

    const groupPermission = await prisma.groupPermission.findMany({
        where: {
            group_id: group.id
        }
    })

    const formulir: any = groupPermission.find((item: any) => item.slug === 'formulir_saat_bergabung');
    group.has_formulir = formulir.status

    group.is_owner = group.group_members.find((member: any) => member.user_id === req.user?.id && member.group_role.slug === 'owner') ? true : false;
    group.total_member = group.group_members.length;
    group.total_post = group.group_posts.length;
    delete group.group_members;
    delete group.group_posts;
    delete group.group_roles;

    return res.status(200).json(new sendResponse(group, 'Komunitas ditemukan', {}, 200));
})

export const listAllComunity = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    let { search, page = 1, limit = 10, username } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    let groups: any, orderBy: Array<any> = [], where: any = {};

    if (Object.keys(req.query).length > 0) {
        Object.keys(req.query).forEach((filter, index) => {
            let key_and_op = filter.split('.');

            if (key_and_op.length > 1) {
                let key = key_and_op[0];
                let op = key_and_op[1];
                let value = req.query[filter];

                if (key == 'sort') {
                    orderBy.push({
                        [op]: value
                    })
                }
            }
        })
    }

    if (username) {
        const user = await prisma.user.findFirst({
            where: {
                username: req.query.username,
            }
        })

        if (!user) {
            return next(new sendError('User tidak ditemukan', [], 'NOT_FOUND', 404));
        }

        where = {
            ...where,
            group_members: {
                some: {
                    user_id: user.id,
                    status: 'joined'
                }
            }
        }
    }

    const total = await prisma.group.count();
    if (search) {
        where = {
            ...where,
            OR: [
                {
                    name: {
                        contains: search.toLowerCase(),
                        mode: 'insensitive'
                    }
                },
                {
                    slug: {
                        contains: search.toLowerCase()
                    }
                }
            ],
        }
    }

    groups = await prisma.group.findMany({
        where: where,
        include: {
            group_members: {
                include: {
                    group_role: true,
                },
            },
            group_posts: true,
            group_roles: true,
        },        
        orderBy: orderBy,
        skip: (page - 1) * limit,
        take: limit,
    })

    groups = await Promise.all(groups.map(async (group: any) => {
        let my_member = group.group_members.find((member: any) => member.user_id === req.user?.id);
        group.is_status = my_member ? my_member.status : 'not_member';
        group.is_member = await joinedGroup(group, req.user?.id) ?? false;
        group.is_owner = group.group_members.find((member: any) => member.user_id === req.user?.id && member.group_role.slug === 'owner') ? true : false;
        group.total_member = group.group_members.length;
        group.total_post = group.group_posts.length;
        delete group.group_members;
        delete group.group_posts;
        delete group.group_roles;
        return group;
    }));
    
    return res.status(200).json(new sendResponse(groups, 'Daftar komunitas ditemukan', pagination(page, limit, total), 200));
})

export const validation = (method: string) => {
    switch (method) {
        case 'checkComunityID': {
            return [
                body("slug", "Group slug is required")
                    .exists()
                    .matches(/^[a-zA-Z0-9_.-]*$/)
                    .withMessage("Group slug must be A-z a-z 0-9 _ - ."),
            ]
        }

        default: {
            return []
        }
    }
}