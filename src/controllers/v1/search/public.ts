import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import asyncHandler from "../../../middleware/async";
import { sendError, sendResponse } from "../../../libraries/rest";
import { pagination } from "../../../libraries/helper";

const prisma = new PrismaClient()

export const searchbyType = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    let { page, limit, search, category } = req.query;

    page = page ? parseInt(page) : 1;
    limit = limit ? parseInt(limit) : 10;

    let where: any, orderBy: Array<any> = [], sort_member: string, sort_post: string;

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

    let { time, categories } = req.query;

    if (time) {
        switch (time) {
            case 'hour': 
                where = {
                    ...where,
                    created_at: {
                        gte: new Date(new Date().setHours(new Date().getHours() - 1))
                    }
                }
                break;
            case 'day': 
                where = {
                    ...where,
                    created_at: {
                        gte: new Date(new Date().setDate(new Date().getDate() - 1))
                    }
                }
                break;
            case 'week':
                where = {
                    ...where,
                    created_at: {
                        gte: new Date(new Date().setDate(new Date().getDate() - 7))
                    }
                }
                break;
            case 'month': 
                where = {
                    ...where,
                    created_at: {
                        gte: new Date(new Date().setMonth(new Date().getMonth() - 1))
                    }
                }
                break;
            case 'year':
                where = {
                    ...where,
                    created_at: {
                        gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1))
                    }
                }
                break;
            default: 
                break;
        }
    }

    if (categories && categories.length > 0) {
        const interests = await prisma.relationInterest.findMany({
            where: {
                relation_id: {
                    in: categories
                },
                type: 'group'
            },
        })

        const interest_ids = interests.map((interest: any) => interest.interest_id)

        where = {
            ...where,
            id: {
                in: interest_ids
            }
        }
    }

    
})