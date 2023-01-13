import { PrismaClient } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import { sendResponse, sendError } from "../../../libraries/rest";
import asyncHandler from "../../../middleware/async";
import { body, validationResult } from "express-validator";
import { pagination } from "../../../libraries/helper";
import { joinedGroup } from "../comunities/helper";

const prisma = new PrismaClient();

export const getInterest = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    let { page, limit, order, search } = req.query;
    page = page ? parseInt(page) : 1;
    limit = limit ? parseInt(limit) : 10;
    order = order ? order : 'asc';

    let where: any = {}, orderBy: Array<any> = [];

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

    if (search) {
        where = {
            OR: [
                {
                    name: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    slug: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    description: {
                        contains: search,
                        mode: 'insensitive'
                    }
                }
            ]
        }
    }

    const interests = await prisma.interest.findMany({
        where: where,
        orderBy: orderBy.length > 0 ? orderBy : {
            id: order
        },
        skip: (page - 1) * limit,
        take: limit
    })

    const total = await prisma.interest.count();

    return res.json(new sendResponse(interests, 'Berhasil mengambil data', pagination(page, limit, total), 200))
})

export const selectInterest = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi gagal', errors.array(), 'VALIDATION_ERROR', 422));
    }

    let relation_id: number;
    const {
        interests,
        type,
        group_id,
    } = req.body

    switch (type) {
        case 'group':
            relation_id = group_id;
            break;
        case 'user':
            relation_id = req.user.id;
            break;
        default:
            return next(new sendError('Tipe tidak ditemukan', [], 'NOT_FOUND', 404));
            break;
    }

    if (type === 'group') {
        const group = await prisma.group.findFirst({
            where: {
                id: group_id,
            }
        })

        if (!group) {
            return next(new sendError('Grup tidak ditemukan', [], 'NOT_FOUND', 404));
        }

        const isOwner = await prisma.groupMember.findFirst({
            where: {
                group_id: group_id,
                user_id: req.user.id,
                group_role: {
                    slug: 'owner'
                }
            }
        })

        if (!isOwner) {
            return next(new sendError('Anda bukan pemilik grup', [], 'PROCESS_ERROR', 400));
        }
    }

    if (interests.length < 1) {
        return next(new sendError('Pilih minimal 1 minat', [], 'PROCESS_ERROR', 400));
    }

    await prisma.relationInterest.deleteMany({
        where: {
            relation_id: relation_id,
            type: type,
        }
    })

    await Promise.all(interests.map(async (interest: any) => {
        if (interest.id === null) {
            let cek = await prisma.interest.findFirst({
                where: {
                    name: interest.name
                }
            })

            if (!cek) {
                cek = await prisma.interest.create({
                    data: {
                        name: interest.name,
                        slug: interest.name.toLowerCase().replace(/ /g, '-'),
                    }
                })
            }

            await prisma.relationInterest.create({
                data: {
                    relation_id: relation_id,
                    interest_id: cek.id,
                    type: type,
                }
            })
        } else {
            let minat = await prisma.interest.findFirst({
                where: {
                    id: interest.id
                }
            })

            if (!minat) {
                minat = await prisma.interest.create({
                    data: {
                        name: interest.name,
                        slug: interest.name.toLowerCase().replace(/ /g, '-'),
                    }
                })
            }

            await prisma.relationInterest.create({
                data: {
                    relation_id: relation_id,
                    interest_id: minat.id,
                    type: type,
                }
            })
        }

    }))

    return res.json(new sendResponse({}, 'Berhasil memilih minat', {}, 200))
})

export const viewInterest = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    let { page, limit, order, search } = req.query;

    page = page ? parseInt(page) : 1;
    limit = limit ? parseInt(limit) : 10;
    order = order ? order : 'desc';

    let where: any = {}, orderBy: Array<any> = [];

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

    if (search) {
        where = {
            OR: [
                {
                    name: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    slug: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    description: {
                        contains: search,
                        mode: 'insensitive'
                    }
                }
            ]
        }
    }

    const user_interest = await prisma.relationInterest.findMany({
        where: {
            relation_id: req.user.id,
            type: 'user'
        }
    })

    const array_interest_id = user_interest.map((res: any) => res.interest_id);

    const group_interest = await prisma.relationInterest.findMany({
        where: {
            interest_id: {
                in: array_interest_id
            },
            type: 'group'
        }
    })

    const array_group_id = group_interest.map((res: any) => res.relation_id);

    const groups = await prisma.group.findMany({
        where: {
            id: {
                in: array_group_id
            }
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
        skip: (page - 1) * limit,
        take: limit,
        orderBy: orderBy,
    })

    await Promise.all(groups.map(async (group: any) => {
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

    const total = await prisma.group.count({
        where: {
            id: {
                in: array_group_id
            }
        }
    })

    return res.json(new sendResponse(groups, 'Berhasil mengambil data', pagination(page, limit, total), 200))
})

export const validation = (method: string) => {
    switch (method) {
        case 'selectInterest': {
            return [
                body('interests')
                    .notEmpty().withMessage('Minat harus diisi')
                    .isArray().withMessage('Minat harus berupa array')
                    .custom(async (value, { req }) => {

                        if (req.body.interests && req.body.interests.length > 0) {
                            if (req.body.interests.length <= 1) {
                                throw new Error('Pilih minimal 1 minat')
                            }

                            req.body.interests.forEach((res: any) => {
                                if (
                                    !(
                                        Object.keys(res).includes("id") &&
                                        Object.keys(res).includes("name")
                                    )
                                ) {
                                    throw new Error("Minat harus berisi id dan nama");
                                }

                                if (!res.name) {
                                    throw new Error("Nama minat tidak boleh kosong");
                                }
                            });
                        }
                    }),
                body('type').notEmpty().withMessage('Tipe harus diisi').isString().withMessage('Tipe harus berupa string').isIn(['group', 'user']).withMessage('Tipe tidak ditemukan'),
                body('group_id').custom(async (value: any, { req }) => {
                    if (req.body.type === 'group') {
                        if (!value) {
                            throw new Error('ID grup harus diisi')
                        }
                    }
                }).optional().isInt().withMessage('ID grup harus berupa angka'),
            ]
        }

        default: {
            return []
        }
    }
}