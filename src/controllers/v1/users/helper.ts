const convertUser = (user: any, user_id: number = 0) => {
    user.is_follow = user.followers.some((follower: any) => follower.follow_user_id === user_id) ? true : false

    user.total_followers = user.followers.length
    user.total_followings = user.followings.length

    delete user.followers
    delete user.followings
}

export {
    convertUser
}