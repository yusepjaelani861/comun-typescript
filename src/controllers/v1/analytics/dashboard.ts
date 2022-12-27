import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import asyncHandler from "../../../middleware/async";
import { sendError, sendResponse } from "../../../libraries/rest";
import { body, validationResult } from "express-validator";
import { pagination } from "../../../libraries/helper";
import moment from "moment";
import { stringify, parse } from "himalaya";
import Randomstring from "randomstring";
import { joinedGroup, myPermissionGroup } from "../comunities/helper";
import { createDateRangeArray } from "./helper";

const prisma = new PrismaClient();

export const analytics = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const { slug } = req.params;
    const {
        from_date,
        to_date
    } = req.query;

    const group = await prisma.group.findFirst({
        where: {
            slug: slug
        }
    })

    if (!group) {
        return next(new sendError('Group tidak ditemukan', [], 'NOT_FOUND', 404));
    }

    const permission = await myPermissionGroup(group, req.user?.id, 'analitik');
    if (!permission) {
        return next(new sendError('Anda tidak memiliki akses', [], 'NOT_FOUND', 404));
    }

    let member: any, post: any, total_view: number, total_unique: number, total_stays: number = 0, total_earning: number = 0;

    let data: any = {
        upvote: 0,
        downvote: 0,
        comment: 0,
    }

    if (!from_date && !to_date) {
        return res.status(200).json(new sendResponse([], 'Berhasil mengambil data', {}, 200));
    }

    member = await prisma.groupMember.findMany({
        where: {
            group_id: group.id,
            updated_at: {
                gte: from_date,
                lte: to_date + '23:59:59'
            }
        }
    })

    post = await prisma.post.findMany({
        where: {
            group_id: group.id,
            created_at: {
                gte: from_date,
                lte: to_date + '23:59:59'
            }
        }
    })

    total_view = await prisma.groupAnalytic.count({
        where: {
            group_id: group.id,
            created_at: {
                gte: from_date,
                lte: to_date + '23:59:59'
            }
        }
    })

    total_unique = await prisma.groupAnalytic.count({
        where: {
            group_id: group.id,
            created_at: {
                gte: from_date,
                lte: to_date + '23:59:59'
            },
            unique: true
        }
    })

    const analytic = await prisma.groupAnalytic.findMany({
        where: {
            group_id: group.id,
            created_at: {
                gte: from_date,
                lte: to_date + '23:59:59'
            }
        }
    })

    Promise.all(analytic.map(async (item: any) => {
        total_stays = total_stays + item.spend_time;
        total_earning = total_earning + item.earning;
    }))

    data = await Promise.all(post.map(async (item: any) => {
        const upvote = await prisma.postUpvote.count({
            where: {
                post_id: item.id,
                created_at: {
                    gte: from_date,
                    lte: to_date + '23:59:59'
                }
            }
        })

        const downvote = await prisma.postDownvote.count({
            where: {
                post_id: item.id,
                created_at: {
                    gte: from_date,
                    lte: to_date + '23:59:59'
                }
            }
        })

        const comment = await prisma.postComment.count({
            where: {
                post_id: item.id,
                created_at: {
                    gte: from_date,
                    lte: to_date + '23:59:59'
                }
            }
        })

        return {
            upvote: upvote,
            downvote: downvote,
            comment: comment,
        }
    }))

    data.upvote = data.reduce((a: any, b: any) => a + b.upvote, 0);
    data.downvote = data.reduce((a: any, b: any) => a + b.downvote, 0);
    data.comment = data.reduce((a: any, b: any) => a + b.comment, 0);

    let analytics: Array<any> = [];

    const rangeDate = createDateRangeArray(from_date, to_date);

    const list = await Promise.all(rangeDate.map(async (item: any) => {
        let hehe: Array<any> = [];
        var date = item;
        var convertDate = new Date(date);
        var newDate = convertDate.toISOString();
        var newDate2 = newDate.split('T')[0];

        const member = await prisma.groupMember.findMany({
            where: {
                group_id: group.id,
                updated_at: {
                    gte: newDate2,
                    lte: newDate2 + '23:59:59'
                }
            }
        })

        const total_view = await prisma.groupAnalytic.count({
            where: {
                group_id: group.id,
                created_at: {
                    gte: newDate2,
                    lte: newDate2 + '23:59:59'
                }
            }
        })

        const total_unique = await prisma.groupAnalytic.count({
            where: {
                group_id: group.id,
                created_at: {
                    gte: newDate2,
                    lte: newDate2 + '23:59:59'
                },
            }
        })

        const stays = await prisma.groupAnalytic.findMany({
            where: {
                group_id: group.id,
                created_at: {
                    gte: newDate2,
                    lte: newDate2 + '23:59:59'
                }
            }
        })

        const total_stays = stays.reduce((a: any, b: any) => a + b.spend_time, 0);
        const total_earning = stays.reduce((a: any, b: any) => a + b.earning, 0);

        const post = await prisma.post.findMany({
            where: {
                group_id: group.id,
                created_at: {
                    gte: newDate2,
                    lte: newDate2 + '23:59:59'
                }
            }
        })

        let data: any = await Promise.all(post.map(async (item: any) => {
            const upvote = await prisma.postUpvote.count({
                where: {
                    post_id: item.id,
                    created_at: {
                        gte: newDate2,
                        lte: newDate2 + '23:59:59'
                    }
                }
            })

            const downvote = await prisma.postDownvote.count({
                where: {
                    post_id: item.id,
                    created_at: {
                        gte: newDate2,
                        lte: newDate2 + '23:59:59'
                    }
                }
            })

            const comment = await prisma.postComment.count({
                where: {
                    post_id: item.id,
                    created_at: {
                        gte: newDate2,
                        lte: newDate2 + '23:59:59'
                    }
                }
            })

            return {
                upvote: upvote,
                downvote: downvote,
                comment: comment,
            }
        }))

        data.upvote = data.reduce((a: any, b: any) => a + b.upvote, 0);
        data.downvote = data.reduce((a: any, b: any) => a + b.downvote, 0);
        data.comment = data.reduce((a: any, b: any) => a + b.comment, 0);

        hehe.push({
            date: newDate2,
            total_views: total_view,
            total_unique_views: total_unique,
            total_stays: total_stays,
            total_earnings: total_earning,
            total_upvotes: data.upvote,
            total_downvotes: data.downvote,
            total_comments: data.comment,
            total_shares: 0,
            total_posts: post.length,
            total_members: member.length
        })

        return hehe;
    }))

    analytics = list.reduce((a: any, b: any) => a.concat(b), []);

    const results = {
        total_views: total_view,
        total_unique_views: total_unique,
        total_stays: total_stays,
        total_earnings: total_earning,
        total_upvotes: data.upvote,
        total_downvotes: data.downvote,
        total_comments: data.comment,
        total_shares: 0,
        total_posts: post.length,
        total_members: member.length,
    }

    return res.status(200).json(new sendResponse({
        results: analytics,
        data: results
    }, 'Berhasil mengambil data', {}, 200))
})