import { NextFunction, Response } from "express";
import { sendResponse, sendError } from "../../libraries/rest";
import asyncHandler from "../../middleware/async";
import { body, validationResult } from "express-validator";
import { rand } from "../../libraries/helper";
import fs from "fs";
import md5 from "md5";
import { encrypt } from "../../libraries/encrypt";
import Randomstring from "randomstring";
import sharp from "sharp";

export const uploadImage = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new sendError('Validasi error', errors.array(), 'VALIDATION_ERROR', 422));
    }

    let myUrl: string = req.protocol + '://' + req.get('host');
    const {
        image
    } = req.files;

    const {
        type
    } = req.body;

    const extension = image.name.split('.').pop()
    const filename = 'image_' + rand()
    const filename_with_ext = filename + '.' + extension;
    const upload_url = '/public/images/' + type + '/';
    const upload_full_path = process.cwd() + upload_url;
    const filesize_in_mb = image.size / (1024 * 1024);

    let cekfolder = fs.existsSync(process.cwd() + upload_url)

    if (!cekfolder) {
        fs.mkdir(process.cwd() + upload_url, { recursive: true }, (err) => {
            if (err) throw err;
        })
    }

    image.mv(upload_full_path + filename_with_ext,
        async function (err: any) {
            if (err) {
                return next(new sendError('Upload image error', [], 'PROCESS_ERROR', 400));
            }
        }
    );

    let data = {
        url: myUrl + '/public/images/' + type + '/' + filename_with_ext,
        path: upload_url,
        filename: filename,
        filesize: filesize_in_mb,
        ext: extension,
        filename_with_ext
    }

    return res.json(new sendResponse(data, 'Upload image success', {}, 200));
})

export const uploadVideo = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    const {
        name,
        currentChunkIndex,
        totalChunks
    } = req.query;

    const firstChunk = parseInt(currentChunkIndex) === 0;
    const lastChunk = parseInt(currentChunkIndex) === parseInt(totalChunks) - 1;

    const ext = name.split('.').pop();

    const data = req.body.toString().split(',')[1];
    const buffer = Buffer.from(data, 'base64');

    const upload_url = '/public/videos/'
    const upload_path = process.cwd() + upload_url;

    const filename = md5(Randomstring.generate(20)).substr(0, 6);
    const filenamewithext = filename + '.' + ext;

    const tmpFilename = 'tmp_' + md5(name + req.ip) + '.' + ext;
    let cekfolder = fs.existsSync(process.cwd() + upload_url)

    if (!cekfolder) {
        fs.mkdir(process.cwd() + upload_url, { recursive: true }, (err) => {
            if (err) throw err;
        })
        console.log('folder created')
    }

    if (firstChunk && fs.existsSync(upload_path + tmpFilename)) {
        fs.unlinkSync(upload_path + tmpFilename);
    }

    fs.appendFileSync(upload_path + tmpFilename, buffer);

    let myUrl: string = req.protocol + '://' + req.get('host');
    let results: any = {
        url: myUrl + upload_url + filenamewithext,
        path: upload_url,
        filename,
        filename_with_ext: filenamewithext,
        ext,
    }

    if (lastChunk) {
        fs.renameSync(upload_path + tmpFilename, upload_path + filenamewithext);

        results.status = 'finish';

        return res.json(new sendResponse(results, 'Success uploading videos', [], 200))
    } else {
        results.status = 'progress';
        return res.json(new sendResponse(results, 'Success uploading videos', [], 200))
    }
})

export const viewImages = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    let { type, slug } = req.params;
    
    const filepath = '/public/images/webp/' + type + '/' + slug + '.webp';
    const fullpath = process.cwd() + filepath;

    if (fs.existsSync(fullpath)) {
        const webp = fs.readFileSync(fullpath);

        res.writeHead(200, {
            'Content-Type': 'image/webp',
            'Content-Length': webp.length,
        });

        return res.end(webp);
    }

    const filepath2 = '/public/images/' + type + '/' + slug;
    const fullpath2 = process.cwd() + filepath2;

    const image = sharp(fullpath2);

    const webp = await image.webp().toBuffer();

    const namewebp = slug + '.webp';

    if (!fs.existsSync(process.cwd() + '/public/images/webp/' + type)) {
        fs.mkdir(process.cwd() + '/public/images/webp/' + type, { recursive: true }, (err) => {
            if (err) throw err;
        })
    }

    fs.writeFileSync(process.cwd() + '/public/images/webp/' + type + '/' + namewebp, webp);

    res.writeHead(200, {
        'Content-Type': 'image/webp',
        'Content-Length': webp.length,
    });

    return res.end(webp);
})

export const validation = (method: string) => {
    switch (method) {
        case 'uploadImage': {
            return [
                body('type')
                .isIn(['post', 'avatar'])
                .withMessage("Please insert image type ['post', 'avatar']"),
                body('image')
                .custom(async (value, { req }) => {
                    if (req.files) {
                        const {
                            image
                        } = req.files;
                    
                        const name = encrypt(image.name)
                        const extension = image.name.split('.').pop()
                    
                        if (extension !== 'jpg' && extension !== 'jpeg' && extension !== 'png' && extension !== 'gif' && extension !== 'webp') {
                            throw new Error('File extension is not allowed')
                        }

                        console.log(image);
                    } else {
                        throw new Error('Please insert file')
                    }
                }),
            ]
        }

        default: {
            return []
        }
    }
}