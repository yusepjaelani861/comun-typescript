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
import JSFTP from 'jsftp'

const ftp_host = process.env.FTP_HOST;
const ftp_user = process.env.FTP_USERNAME;
const ftp_pass = process.env.FTP_PASSWORD;
const ftp_port = process.env.FTP_PORT;
const ftp_url = process.env.FTP_URL;


const ftp = new JSFTP({
    host: ftp_host,
    port: ftp_port ? parseInt(ftp_port) : 21,
    user: ftp_user,
    pass: ftp_pass,
})

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

            const buffer = fs.readFileSync(upload_full_path + filename_with_ext);
            ftp.put(buffer, upload_url + filename_with_ext, function (err: any) {
                if (err) {
                    return next(new sendError('Upload image error', err, 'PROCESS_ERROR', 400));
                }

                fs.unlink(upload_full_path + filename_with_ext, (err: any) => {
                    if (err) {
                        return next(new sendError('Upload image error', err, 'PROCESS_ERROR', 400));
                    }
                })
            })

        }
    );
    const urlftp = ftp_url + upload_url + filename_with_ext

    let data = {
        // url: myUrl + '/public/images/' + type + '/' + filename_with_ext,
        url: urlftp,
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
    const urlftp = ftp_url + upload_url + filenamewithext
    let results: any = {
        // url: myUrl + upload_url + filenamewithext,
        url: urlftp,
        path: upload_url,
        filename,
        filename_with_ext: filenamewithext,
        ext,
    }

    if (lastChunk) {
        fs.renameSync(upload_path + tmpFilename, upload_path + filenamewithext);

        const buffer = fs.readFileSync(upload_path + filenamewithext);
            ftp.put(buffer, upload_url + filenamewithext, function (err: any) {
                if (err) {
                    return next(new sendError('Upload image error', err, 'PROCESS_ERROR', 400));
                }

                fs.unlink(upload_path + filenamewithext, (err: any) => {
                    if (err) {
                        return next(new sendError('Upload image error', err, 'PROCESS_ERROR', 400));
                    }
                })
            })

        results.status = 'finish';

        return res.json(new sendResponse(results, 'Success uploading videos', [], 200))
    } else {
        results.status = 'progress';
        return res.json(new sendResponse(results, 'Success uploading videos', [], 200))
    }
})

const calculateAspectRation = (sourceWidth: number, sourceHeight: number, width: number, height: number) => {
    let aspectRatio = 1;
    if (width && !height) {
        aspectRatio = width / sourceWidth;
    } else if (height && !width) {
        aspectRatio = height / sourceHeight;
    } else if (width && height) {
        aspectRatio = width / sourceWidth;
    }

    return aspectRatio;
}

export const viewImages = asyncHandler(async (req: any, res: Response, next: NextFunction) => {
    let { type, slug } = req.params;
    let { width, height } = req.query;

    const extension = slug.split('.').pop();
    if (extension === 'webp') {
        if (fs.existsSync(process.cwd() + '/public/images/' + type + '/' + slug)) {
            res.end(fs.readFileSync(process.cwd() + '/public/images/' + type + '/' + slug));
        }

        return res.end();
    }

    let webp;
    let namepath;
    if (width || height) {
        namepath = process.cwd() + '/public/images/webp/' + type + '/' + slug;

        if (width) {
            namepath = process.cwd() + '/public/images/webp/' + type + '/' + slug + '_' + width + '.webp';
        }

        if (height) {
            namepath = process.cwd() + '/public/images/webp/' + type + '/' + slug + '_' + height + '.webp';
        }

        if (fs.existsSync(namepath)) {
            res.writeHead(200, {
                'Content-Type': 'image/webp'
            });

            webp = fs.readFileSync(namepath);

            return res.end(webp);
        }

        const image = sharp(process.cwd() + '/public/images/' + type + '/' + slug)
        const metadata = await image.metadata();
        const imgHeight = metadata.height || 0;
        const imgWidth = metadata.width || 0;

        const ratio = calculateAspectRation(imgHeight, imgWidth, parseInt(width), parseInt(height));

        width = imgWidth * ratio;
        height = imgHeight * ratio;

        webp = await image.webp().resize(parseInt(width), parseInt(height)).toBuffer();

        if (!fs.existsSync(process.cwd() + '/public/images/webp/' + type)) {
            fs.mkdirSync(process.cwd() + '/public/images/webp/' + type);
        }

        fs.writeFileSync(namepath, webp);

        res.writeHead(200, {
            'Content-Type': 'image/webp',
        })

        res.end(webp);

        return res.json({
            width: imgWidth,
            height: imgHeight,
        })
    }

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

    webp = await image.webp().toBuffer();

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