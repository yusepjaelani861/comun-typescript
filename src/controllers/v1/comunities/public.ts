import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import asyncHandler from "../../../middleware/async";
import { sendError, sendResponse } from "../../../libraries/rest";
import { body, validationResult } from "express-validator";
import { createMemberPermission, createRolePermission, joinedGroup, myPermissionGroup } from "./helper";
import { pagination } from "../../../libraries/helper";

const prisma = new PrismaClient();

export const checkComunityID = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    const { group_slug } = req.body;

    const group = await prisma.group.findFirst({
        where: {
            slug: group_slug
        }
    })

    return res.status(200).json(new sendResponse(group ? true : false, group ? 'Comun ID telah digunakan' : 'Comun ID tersedia', {}, 200));
})

export const viewComunity = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { slug } = req.params;

    const group: any = await prisma.group.findFirst({
        where: {
            slug: slug
        },
        include: {
            group_members: {
                include: {
                    group_role: true,
                }
            },
            group_posts: true,
            group_roles: true,
        }
    })

    if (!group) {
        return next(new sendError('Komunitas tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const my_member = group.group_members.find((member: any) => member.user_id === req.user?.id);
    group.is_status = my_member ? my_member.status : 'not_member';
    group.is_member = joinedGroup(group, req.user?.id) ?? false;
    group.is_owner = group.group_members.find((member: any) => member.user_id === req.user?.id && member.group_role.slug === 'owner') ? true : false;
    group.total_member = group.group_members.length;
    group.total_post = group.group_posts.length;
    delete group.group_members;
    delete group.group_posts;
    delete group.group_roles;

    return res.status(200).json(new sendResponse(group, 'Komunitas ditemukan', {}, 200));
})

export const listAllComunity = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    let { search, page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    let groups: any;

    const total = await prisma.group.count();
    if (search) {
        groups = await prisma.group.findMany({
            where: {
                OR: [
                    {
                        name: {
                            contains: search
                        }
                    },
                    {
                        slug: {
                            contains: search
                        }
                    }
                ]
            },
            include: {
                group_members: {
                    include: {
                        group_role: true,
                    }
                },
                group_posts: true,
                group_roles: true,
            },
            orderBy: {
                created_at: 'desc'
            },
            skip: (page - 1) * limit,
            take: limit,
        })
    } else {
        groups = await prisma.group.findMany({
            include: {
                group_members: {
                    include: {
                        group_role: true,
                    }
                },
                group_posts: true,
                group_roles: true,
            },
            orderBy: {
                created_at: 'desc'
            },
            skip: (page - 1) * limit,
            take: limit,
        })
    }

    groups = groups.map((group: any) => {
        const my_member = group.group_members.find((member: any) => member.user_id === req.user?.id);
        group.is_status = my_member ? my_member.status : 'not_member';
        group.is_member = joinedGroup(group, req.user?.id) ?? false;
        group.is_owner = group.group_members.find((member: any) => member.user_id === req.user?.id && member.group_role.slug === 'owner') ? true : false;
        group.group_member_count = group.group_members.length;
        group.post_count = group.group_posts.length;
        delete group.group_members;
        delete group.group_posts;
        delete group.group_roles;
        return group;
    })

    return res.status(200).json(new sendResponse(groups, 'Daftar komunitas ditemukan', pagination(page, limit, total), 200));
})

export const validation = (method: string) => {
    switch (method) {
        case 'checkComunityID': {
            return [
                body("group_slug", "Group slug is required")
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