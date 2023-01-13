import countryCode from './config/countrycodes.json'
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const url_image = 'https://countryflagsapi.com'
export const countryCodes = async () => {
    let data: Array<any> = [];
    await Promise.all(countryCode.map(async (code: any) => {
        const file_path = path.join(__dirname, `../public/country/${code.code}.svg`)

        const image = await axios.get(`${url_image}/svg/${code.code}`, {
            responseType: 'arraybuffer'
        })

        fs.writeFileSync(file_path, image.data)
        console.log('File ' + code.code + ' saved!')
    }))

    return data;
}

countryCodes()