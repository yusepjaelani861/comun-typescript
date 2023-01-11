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
                gte: new Date(from_date),
                lte: new Date(to_date + ' 23:59:59')
            }
        }
    })

    post = await prisma.post.findMany({
        where: {
            group_id: group.id,
            created_at: {
                gte: new Date(from_date),
                lte: new Date(to_date + ' 23:59:59')
            }
        }
    })

    total_view = await prisma.groupAnalytic.count({
        where: {
            group_id: group.id,
            created_at: {
                gte: new Date(from_date),
                lte: new Date(to_date + ' 23:59:59')
            }
        }
    })

    total_unique = await prisma.groupAnalytic.count({
        where: {
            group_id: group.id,
            created_at: {
                gte: new Date(from_date),
                lte: new Date(to_date + ' 23:59:59')
            },
            unique: true
        }
    })

    const analytic = await prisma.groupAnalytic.findMany({
        where: {
            group_id: group.id,
            created_at: {
                gte: new Date(from_date),
                lte: new Date(to_date + ' 23:59:59')
            }
        }
    })

    Promise.all(analytic.map(async (item: any) => {
        total_stays = total_stays + item.spend_time;
        total_earning = total_earning + item.earning;
    }))

    let upvote_post: number = 0, downvote_post: number = 0, comment_post: number = 0;
    await Promise.all(post.map(async (item: any) => {
        item.upvote_post = 0;
        item.downvote_post = 0;
        item.comment_post = 0;

        const upvote = await prisma.postVotes.count({
            where: {
                post_id: item.id,
                type: 'upvote'
                // created_at: {
                //     gte: new Date(from_date),
                //     lte: new Date(to_date + ' 23:59:59')
                    
                // }
            }
        })

        const downvote = await prisma.postVotes.count({
            where: {
                post_id: item.id,
                type: 'downvote'
                // created_at: {
                //     gte: new Date(from_date),
                //     lte: new Date(to_date + ' 23:59:59')
                // }
            }
        })

        const comment = await prisma.postComment.count({
            where: {
                post_id: item.id,
                // created_at: {
                //     gte: new Date(from_date),
                //     lte: new Date(to_date + ' 23:59:59')
                // }
            }
        })

        item.upvote_post = upvote + item.upvote_post;
        item.downvote_post = downvote + item.downvote_post;
        item.comment_post = comment + item.comment_post;
    }))

    data.upvote = post.reduce((a: any, b: any) => a + b.upvote_post, 0);
    data.downvote = post.reduce((a: any, b: any) => a + b.downvote_post, 0);
    data.comment = post.reduce((a: any, b: any) => a + b.comment_post, 0);

    let analytics: Array<any> = [];

    const rangeDate = createDateRangeArray(from_date, to_date);

    const list = await Promise.all(rangeDate.map(async (item: any) => {
        let hehe: Array<any> = [];
        var date = item;
        var convertDate = new Date(date);
        var newDate = convertDate.toISOString();
        var newDate2 = newDate.split('T')[0];

        let newDateS, newDateS2;
        newDateS = convertDate.toISOString();
        newDateS2 = newDate.split('T')[0];

        let member, post, total_view, total_unique, stays, earning;

        member = await prisma.groupMember.findMany({
            where: {
                group_id: group.id,
                updated_at: {
                    gte: new Date(newDateS2 + 'T00:00:00.000Z'),
                    lte: new Date(newDateS2 + 'T23:59:59.999Z')
                }
            }
        })

        total_view = await prisma.groupAnalytic.count({
            where: {
                group_id: group.id,
                created_at: {
                    gte: new Date(newDateS2 + 'T00:00:00.000Z'),
                    lte: new Date(newDateS2 + 'T23:59:59.999Z')
                }
            }
        })

        total_unique = await prisma.groupAnalytic.count({
            where: {
                group_id: group.id,
                created_at: {
                    gte: new Date(newDateS2 + 'T00:00:00.000Z'),
                    lte: new Date(newDateS2 + 'T23:59:59.999Z')
                },
            }
        })

        stays = await prisma.groupAnalytic.findMany({
            where: {
                group_id: group.id,
                created_at: {
                    gte: new Date(newDateS2 + 'T00:00:00.000Z'),
                    lte: new Date(newDateS2 + 'T23:59:59.999Z')
                }
            }
        })

        total_stays = stays.reduce((a: any, b: any) => a + b.spend_time, 0);
        total_earning = stays.reduce((a: any, b: any) => a + b.earning, 0);

        
        post = await prisma.post.findMany({
            where: {
                group_id: group.id,
                created_at: {
                    gte: new Date(newDateS2 + 'T00:00:00.000Z'),
                    lte: new Date(newDateS2 + 'T23:59:59.999Z')
                }
            }
        })

        
        let upvote_post: number = 0, downvote_post: number = 0, comment_post: number = 0;
        let dataChild: any = {};
        await Promise.all(post.map(async (item: any) => {
            item.upvote_post = 0;
            item.downvote_post = 0;
            item.comment_post = 0;

            const upvote = await prisma.postVotes.count({
                where: {
                    post_id: item.id,
                    type: 'upvote'
                    // created_at: {
                    //     gte: convertDate,
                    //     lte: new Date(convertDate.getTime() + 86400000)
                    // }
                }
            })

            const downvote = await prisma.postVotes.count({
                where: {
                    post_id: item.id,
                    type: 'downvote'
                    // created_at: {
                    //     gte: convertDate,
                    //     lte: new Date(convertDate.getTime() + 86400000)
                    // }
                }
            })

            const comment = await prisma.postComment.count({
                where: {
                    post_id: item.id,
                    // created_at: {
                    //     gte: convertDate,
                    //     lte: new Date(convertDate.getTime() + 86400000)
                    // }
                }
            })

            
            item.upvote_post = upvote + item.upvote_post;
            item.downvote_post = downvote + item.downvote_post;
            item.comment_post = comment + item.comment_post;
        }))

        dataChild.upvote = post.reduce((a: any, b: any) => a + b.upvote_post, 0);
        dataChild.downvote = post.reduce((a: any, b: any) => a + b.downvote_post, 0);
        dataChild.comment = post.reduce((a: any, b: any) => a + b.comment_post, 0);

        hehe.push({
            date: newDate2,
            total_views: total_view,
            total_unique_views: total_unique,
            total_stays: total_stays,
            total_earnings: total_earning,
            total_upvotes: dataChild.upvote,
            total_downvotes: dataChild.downvote,
            total_comments: dataChild.comment,
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