import { PrismaClient } from "@prisma/client";
import moment from "moment";
const prisma = new PrismaClient();


export const convertResPost = async (post: any, user_id: number = 0) => {
    let url: string;
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
    post.url = url;
    post.created_at_formatted = moment(post.created_at).fromNow();
    post.updated_at_formatted = moment(post.updated_at).fromNow();
    post.post_comments_count = post.post_comments.length;
    post.post_upvotes_count = post.post_upvotes.length;
    post.post_downvotes_count = post.post_downvotes.length;
    post.post_vote_options_count = post.post_vote_options.length;
    post.is_downvote = false;
    post.is_upvote = false;
    delete post.post_comments;
    delete post.post_upvotes;
    delete post.post_downvotes;

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
    }

    return post;
}