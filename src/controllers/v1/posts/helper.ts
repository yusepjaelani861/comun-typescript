import { PrismaClient } from "@prisma/client";
import { parse, stringify } from "himalaya";
import moment from "moment";
const prisma = new PrismaClient();


export const convertResPost = async (post: any, user_id: number = 0) => {
    let url: string;
    const group: any = await prisma.group.findFirst({
        where: {
            id: post.group_id
        },
        include: {
            group_members: true,
        }
    })

    if (post.post_content_type === 'answer_question') {
        const post_before: any = await prisma.post.findFirst({
            where: {
                id: post.post_question_id
            },
        })

        url = '/' + post.group.slug + '/' + post_before.slug + '/' + post.slug;
    } else {
        url = '/' + post.group.slug + '/' + post.slug;
    }

    post.attachments_data_aspect_ratio = null
    post.body_formatted = ""
    post.body = JSON.parse(post.body)
    if (post.body && post.body.length > 0) {
        const search_all_tag_p = post.body.filter((item: any) => item.tagName === 'p');
        const search_figure = post.body.filter((item: any) => item.tagName === 'figure');
        const search_img = search_figure?.filter((item: any) => item.children[0].tagName === 'img');
        const search_attributes_aspect_ratio = search_img[0].children.filter(
            (res: any) => res.type == "element" && res.tagName == "img"
          )[0].attributes[3].value

        post.attachments_data_aspect_ratio = search_attributes_aspect_ratio

        if (search_all_tag_p.length > 0) {
            post.body_formatted = stringify(search_all_tag_p);
        } else {
            post.body_formatted = ""
        }
    }
    post.url = url;
    post.created_at_formatted = moment(post.created_at).fromNow();
    post.updated_at_formatted = moment(post.updated_at).fromNow();
    post.post_comments_count = post.post_comments.length;
    post.post_upvotes_count = post.post_upvotes.length;
    post.post_downvotes_count = post.post_downvotes.length;
    post.post_vote_options_count = post.post_vote_options.length;
    post.body = post.body ? stringify(post.body) : '';
    post.is_downvote = false;
    post.is_upvote = false;
    delete post.post_comments;
    delete post.post_upvotes;
    delete post.post_downvotes;
    post.is_joined = false;

    if (user_id != 0) {
        const post_upvote: any = await prisma.postUpvote.findFirst({
            where: {
                post_id: post.id,
                user_id: user_id,
            },
        })

        const post_downvote: any = await prisma.postDownvote.findFirst({
            where: {
                post_id: post.id,
                user_id: user_id,
            },
        })

        if (post_upvote) {
            post.is_upvote = true;
        }

        if (post_downvote) {
            post.is_downvote = true;
        }

        post.is_joined = group.group_members.some((group_member: any) => group_member.user_id === user_id);
    }

    return post;
}