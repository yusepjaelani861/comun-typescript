import { PrismaClient } from "@prisma/client";
import e from "express";
import { parse, stringify } from "himalaya";
import moment from "moment";
import { myPermissionGroup } from "../comunities/helper";
const prisma = new PrismaClient();


export const convertResPost = async (post: any, user_id: number = 0) => {
    let url: string;
    const group: any = await prisma.group.findFirst({
        where: {
            id: post.group_id
        },
        include: {
            group_members: {
                where: {
                    status: 'joined'
                }
            },
        }
    })

    if (post.content_type === 'answer_question') {
        const post_before: any = await prisma.post.findFirst({
            where: {
                id: post.question_post_id
            },
        })

        url = '/' + post.group.slug + '/' + post_before.slug + '/' + post.slug;
        post.question_title = post_before.title
        post.question_slug = post_before.slug
        post.question_url = '/' + post.group.slug + '/' + post_before.slug
    } else {
        url = '/' + post.group.slug + '/' + post.slug;
    }

    post.attachments_data_aspect_ratio = null
    post.body_formatted = ""
    post.body = JSON.parse(post.body)
    if (post.body && post.body.length > 0) {
        const search_figure = post.body?.filter((item: any) => item.tagName === 'figure');
        let search_attributes_aspect_ratio;
        search_attributes_aspect_ratio = null;
        if (search_figure && search_figure.length > 0) {
            const search_img = search_figure?.filter((item: any) => item.children[0].tagName === 'img');
            search_attributes_aspect_ratio = search_img[0].children.filter(
                (res: any) => res.type == "element" && res.tagName == "img"
              )[0].attributes[3].value
        }

        post.attachments_data_aspect_ratio = search_attributes_aspect_ratio

            const search_all_tag_p = post.body?.filter((item: any) => item.tagName === 'p');
            if (search_all_tag_p.length > 0) {
                post.body_formatted = stringify(search_all_tag_p);
            } else {
                post.body_formatted = ""
            }
    }
    post.seo_description = post.body_formatted.replace(/(<([^>]+)>)/gi, "").substring(0, 160);
    post.url = url;
    post.created_at_formatted = moment(post.created_at).fromNow();
    post.updated_at_formatted = moment(post.updated_at).fromNow();
    post.post_comments_count = post.post_comments.length;
    post.post_upvotes_count = post.post_upvotes.filter((item: any) => item.type === 'upvote').length;
    post.post_downvotes_count = post.post_upvotes.filter((item: any) => item.type === 'downvote').length;
    post.post_vote_options_count = post.post_vote_options.length;
    if (post.post_vote_options_count > 0) {
        const has_image = post.post_vote_options.some((item: any) => item.image != null && item.image != '') ? true : false;
        await Promise.all(post.post_vote_options.map(async (item: any) => {
            if (has_image) {
                item.image = item.image ? item.image : 'https://ui-avatars.com/api/?name='+ item.name +'&background=0D8ABC&color=fff&size=128';
            } else {
                item.image = null;
            }
            if (user_id) {
                item.is_selected = item.post_vote_members.some((post_vote_member: any) => post_vote_member.user_id === user_id) ? true : false;
            } else {
                item.is_selected = false;
            }
            const vote_members = await prisma.postVoteMember.count({
                where: {
                    post_option_id: item.id,
                },
            })
            item.post_vote_members_count = vote_members;
        }))
    }
    post.body = post.body ? stringify(post.body) : '';
    post.is_downvote = post.post_upvotes.some((post_upvote: any) => post_upvote.user_id === user_id && post_upvote.type === 'downvote') ? true : false;
    post.is_upvote = post.post_upvotes.some((post_downvote: any) => post_downvote.user_id === user_id && post_downvote.type === 'upvote') ? true : false;
    post.has_access_to_delete = false
    const has_access_delete = await myPermissionGroup(group, user_id, 'hapus_konten')
    if (has_access_delete && has_access_delete === true) {
        post.has_access_to_delete = true
    }

    if (post.user_id === user_id) {
        post.has_access_to_delete = true
    }
    post.user.is_follow = post.user.followers.some((follower: any) => follower.follow_user_id === user_id) ? true : false;
    delete post.user.followers;
    delete post.post_comments;
    delete post.post_upvotes;
    post.is_joined = group.group_members.some((group_member: any) => group_member.user_id === user_id) ? true : false;

    return post;
}