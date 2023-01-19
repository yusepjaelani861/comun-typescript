import pgpromise from 'pg-promise';
import dotenv from 'dotenv';

dotenv.config();

const connection: string = process.env.POSTGRE_DATABASE_URL ?? '';

console.log(connection);

const pgp = pgpromise();
const db = pgp(connection);

export const insert = ($table: any, $data: any) => {
    const field = Object.keys($data);
    const value = Object.values($data);
    return db.none(`INSERT INTO $1~ ($2:name) VALUES ($3:csv)`, [$table, field, value]);

}
export const select = ($table: any) => {
    return db.any('SELECT * FROM $1~ ', [$table]);
}
export const selectWhere = ($table: any, $data: any) => {
    const field = Object.keys($data); 
    const value = Object.values($data); 
    return db.any(`SELECT * FROM $1~ WHERE $2:name = $3`, [$table, field, value]);
}

export const update = ($table: any, $data: any, $where: any) => {
    const field = Object.keys($data);
    const value = Object.values($data);

    let str_update = ``;

    field.forEach((item, index) => {
        str_update += `"${item}" = '${value[index]}'`;

        if (index < field.length - 1) {
            str_update += ", ";
        }
    });

    const whereField = Object.keys($where);
    const whereValue = Object.values($where);

    let str_where = ``;

    whereField.forEach((item, index) => {
        str_where += `"${item}" = '${whereValue[index]}'`;
    });
    
    let sql = `UPDATE "${$table}" SET ${str_update} WHERE ${str_where}`

    return db.none(sql);
}

export const deleteWhere = ($table: any, $data: any) => {

    const field = Object.keys($data);
    const value = Object.values($data);

    let str_where = ``;

    field.forEach((item, index) => {
        str_where += `"${item}" = '${value[index]}'`;
    })

    let query = `DELETE FROM "${$table}" WHERE ${str_where}`;

    return db.none(query);

}