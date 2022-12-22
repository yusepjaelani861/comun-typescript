export const generate_otp = () => {
    var digits = '0123456789';
    let OTP = '';
    for (let i = 0; i < 6; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
    }
    return OTP;
}

export const truncateWords = (word: string, maxlength: number) => {
    const i = word.search(/[.?!]/) + 1;
    return word.slice(0, i ? i : word.length).split(' ').slice(0, maxlength).join(' ');
}

export const rand = () => {
    var digits = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let OTP = '';
    for (let i = 0; i < 6; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
    }
    return OTP;
}

export const pagination = (page: any, limit: number, total: number) => {
    const totalPage = Math.ceil(total / limit) < 1 ? 1 : Math.ceil(total / limit);
    const nextPage = page + 1 > totalPage ? totalPage : page + 1;
    const prevPage = page - 1 < 1 ? 1 : page - 1;

    return {
        total: total,
        per_page: limit,
        prev_page: prevPage,
        next_page: nextPage,
        current_page: parseInt(page),
        from: (page - 1) * limit + 1,
        to: page * limit > total ? total : page * limit,
    }
}