import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const tablelib = async (request: any, select: Array<any>, table: string, join: string, where: string, group: string, pagination: boolean = false, relation: Array<any>) => {
    let select_real = "", select_as_object: any = [], select_rules : any = [];
    select.forEach((select, index) => {
        if (typeof select === 'object') {
            if (select.query && select.as) {
                select_as_object.push(select);
                select_real += select.query + " AS " + select.as;
            }
        } else {
            select_rules.push(select);
            select_real += select;
        }

        if (index < select.length - 1) {
            select_real += ", ";
        }
    })

    let where_filter : any = [], sort : any = [];

    if (Object.keys(request.query).length > 0) {
        Object.keys(request.query).forEach((query, index) => {
            let filter_key_and_op = query.split('.');
            let filter_values : any = Object.values(request.query)[index];

            if (filter_key_and_op.length === 2) {
                let filter_key = filter_key_and_op[0];
                let filter_op = filter_key_and_op[1];

                if (filter_op === 'sort') {
                    sort.push({
                        key: filter_key,
                        value: filter_values
                    })
                }
                
                let search_rules_as_objects : any = {};

                if (select_as_object.length > 0) {
                    search_rules_as_objects = select_as_object.find((object : any) => {
                        return object.as === filter_key;
                    })
                }

                if (search_rules_as_objects) {
                    if (typeof filter_values === 'object') {
                        let filter_dump : string = "";

                        filter_values.forEach((value: any, index: number) => {
                            filter_dump += getFilter(filter_op, search_rules_as_objects.query, value).filter_string;

                            if (index < filter_values.length - 1) {
                                filter_dump += " AND ";
                            }
                        })

                        where_filter.push('(' + filter_dump + ')');
                    }

                    if (typeof filter_values === 'string' && filter_values !== '') {
                        where_filter.push(getFilter(filter_op, search_rules_as_objects.query, filter_values).filter_string);
                    }
                }

                if (select_rules.includes(filter_key)) {
                    if (typeof filter_values === 'object') {
                        let filter_dump : string = "";

                        filter_values.forEach((value: any, index: number) => {
                            filter_dump += getFilter(filter_op, filter_key, value).filter_string;

                            if (index < filter_values.length - 1) {
                                filter_dump += " AND ";
                            }
                        })

                        where_filter.push('(' + filter_dump + ')');
                    }

                    if (typeof filter_values === 'string' && filter_values !== '') {
                        where_filter.push(getFilter(filter_op, filter_key, filter_values).filter_string);
                    }
                }
            }
        })
    }

    let sort_string : string = "";

    sort.forEach((sort : any, index : number) => {
        sort_string += sort.key + " " + sort.value.toUpperCase();

        if (index < sort.length - 1) {
            sort_string += ", ";
        }
    })

    let where_filter_query : string = "";

    where_filter.forEach((filter : string, index : number) => {
        where_filter_query += filter;

        if (index < where_filter.length - 1) {
            where_filter_query += " AND ";
        }
    })

    let limit = request.query.limit ? parseInt(request.query.limit) : 10;
    let page = request.query.page ? parseInt(request.query.page) : 1;
    let start = (page - 1) * limit;

    let filter_real = `
        ${where ? `AND ${where}` : ''}
        ${where_filter_query ? `AND ${where_filter_query}` : ''}
    `;

    let query = `
        SELECT ${select_real}
        FROM ${table}
        WHERE true ${filter_real}
        ${group}
        ${sort_string ? `ORDER BY ${sort_string}` : ''}
    `;

    if (pagination && !where_filter_query) {
        query += `LIMIT ${limit} OFFSET ${start}`;
    }

    let query_total = `
        SELECT COUNT(*) AS total
        FROM
            (SELECT ${select_real} FROM ${table} ${join} WHERE true ${filter_real} ${group}) AS total
    `;

    let results : any = await prisma.$queryRaw`${query}`;

    let result_total : any = await prisma.$queryRaw`${query_total}`;

    let total = result_total[0].total;

    let pagination_results : any = {};

    pagination_results = pageGenerate(total, page, limit, start);

    if (relation.length > 0) {
        results = await relationGenerate(results, relation);
    }

    return {
        data: results,
        pagination: pagination_results
    }
}

const relationGenerate = async (data : any, relation : Array<any>) => {
    await Promise.all(relation.map(async (relation : any) => {
        let id = get_value_by_key_array_object(data, relation.key);
        let results : any = relation.type === 'all' ? [] : {};

        let query : any = {
            where: {
                [relation.foreign_key]: {
                    in: id
                }
            }
        };

        if (relation.include) {
            query.include = relation.include;
        }

        if (relation.attributes) {
            query.attributes = relation.attributes;
        }

        if (relation.raw) {
            query.raw = relation.raw;
        }

        if (relation.nested) {
            query.nested = relation.nested;
        }

        if (relation.type === 'one') {
            let model : string = relation.model;
            // results = await prisma[model].findFirst(query);
            results = await prisma.$queryRaw`SELECT * FROM ${model} WHERE ${relation.foreign_key} IN (${id})`;

            if (results) {
                data.forEach((object : any, index : number) => {
                    if (results[relation.foreign_key]) {
                        if (results[relation.foreign_key] === object[relation.key]) {
                            data[index][relation.name] = results;
                        }
                    } else {
                        data[index][relation.name] = {};
                    }
                })
            }
        }

        if (relation.type === 'all') {
            // results = await prisma[relation.model].findMany(query);
            results = await prisma.$queryRaw`SELECT * FROM ${relation.model} WHERE ${relation.foreign_key} IN (${id})`;

            data.forEach((object : any, index : number) => {
                let existing = results.filter((result : any, index : number) => {
                    return result[relation.foreign_key] === object[relation.key];
                })

                if (!relation.hide_count) {
                    data[index][relation.name + '_count'] = existing.length;
                }

                if (!relation.hide_list) {
                    data[index][relation.name] = existing;
                }
            })
        }
    }));

    return data;
}

const get_value_by_key_array_object = (array : Array<any>, key : string) => {
    return array.map((object : any) => {
        return object[key];
    }, [])
}

const getFilter = (operator : string, field : string, value : any) => {
    let filter_op : string = "";
    let filter_string : string = "";

    switch (operator) {
        case 'eq':
            filter_op = "=";
            filter_string = field + " " + filter_op + " " + value;
            break;
        case 'ne': 
            filter_op = "!=";
            filter_string = field + " " + filter_op + " " + value;
            break;
        case 'is':
            filter_op = "IS NULL";
            filter_string = field + " " + filter_op + " " + value;
            break;
        case 'gt':
            filter_op = ">";
            filter_string = field + " " + filter_op + " " + value;
            break;
        case 'gte':
            filter_op = ">=";
            filter_string = field + " " + filter_op + " " + value;
            break;
        case 'lt':
            filter_op = "<";
            filter_string = field + " " + filter_op + " " + value;
            break;
        case 'lte':
            filter_op = "<=";
            filter_string = field + " " + filter_op + " " + value;
            break;
        case 'like':
            filter_op = "LIKE";
            filter_string = field + " " + filter_op + " %" + value;
            break;
        case 'notlike':
            filter_op = "NOT LIKE";
            filter_string = field + " " + filter_op + " %" + value;
            break;
        case 'substring':
            filter_op = "LIKE";
            filter_string = field + " " + filter_op + " %" + value + "%";
            break;
        default: 
            filter_op = "=";
            filter_string = field + " " + filter_op + " " + value;
            break;
    }

    return {
        filter_op,
        filter_string
    }
}

const pageGenerate = (total : number, page : number, limit : number, start : number) => {
    let total_page : number = Math.ceil(total / limit);
    let end : number = page * limit;

    start = start + 1;

    if (end > total) {
        end = total;
    }

    if (total === 0) {
        start = total;
    }

    let prev_page : number = page - 1;
    if (prev_page < 1) {
        prev_page = 0;
    }

    let next_page : number = page + 1;
    if (next_page > total_page) {
        next_page = 0;
    }

    let from : number = 1;
    let to = total_page;

    let to_page : number = page - 2;
    if (to_page > 0) {
        from = to_page;
    }

    if (total_page >= 5) {
        to = from + 5;
        if (to > total_page) {
            to = total_page;
        }
    }

    if (total_page <= 0) {
        to = 5;
    }

    let detail : Array<any> = [];
    let first_page_is_true: boolean = false;
    let last_page_is_true: boolean = false;


    if (total_page > 1) {
        for (let i = from; i <= to; i++) {
            // detail.push({
            //     page: i,
            //     active: i === page
            // })
            detail.push(i);
        }

        if (from !== 1) {
            first_page_is_true = true;
            last_page_is_true = true;
        }
    }

    let total_display : number = limit;
    if (next_page === 0) {
        // total_display = total - ((page - 1) * limit);
        total_display = total % limit;
    }

    return {
        total: total,
        total_page: total_page,
        current_page: page,
        limit: limit,
        start: start,
        end: end,
        prev_page: prev_page,
        next_page: next_page,
        detail: detail,
    }
}
