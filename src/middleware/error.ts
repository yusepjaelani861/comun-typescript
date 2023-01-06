import { Request, Response, NextFunction } from 'express';
import fs from 'fs';

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.log(err);

    let message_error: any =
        '=====================================' + '\n' +
        'Date: ' + new Date() + '\n' +
        '=====================================' + '\n' +
        'Error Code: ' + err.error?.error_code + '\n' +
        'Error Message: ' + err.message + '\n' +
        'Error Data:' +
        ' \r' +
        err.stack +
        ' \r' +
        '\n' +
        '=====================================' + '\n';
    fs.appendFile('error.log', message_error, function (err: any) {
        if (err) throw err;
    });

    if (typeof (err) !== 'undefined' && err.error.error_code == 'VALIDATION_ERROR') {
        let error_validation: any = {};

        err.error.error_data.forEach((element: any) => {
            error_validation[element.param] = [element.msg];
        })
        return res.status(err.status || 400).json({
            success: false,
            message: err.message || 'Server Error',
            data: err.data || null,
            error: {
                error_code: err.error?.error_code || 'PROCESS_ERROR',
                error_data: error_validation || null,
            }
        })
    }

    if (typeof (err) !== 'undefined' && err.error.error_code == 'PROCESS_ERROR') {
        return res.status(err.status || 400).json({
            success: false,
            message: err.message || 'Server Error',
            data: err.data || null,
            error: {
                error_code: err.error?.error_code || 'PROCESS_ERROR',
                error_data: err.error_data || null,
            }
        })
    }

    if (err.name == 'SequelizeDatabaseError') {
        return res.status(500).json({
            success: false,
            message: 'Server Error',
            data: null,
            error: {
                error_code: 'DATABASE_ERROR',
                error_data: null,
            }
        })
    }

    res.status(err.status || 400).json({
        success: false,
        message: err.message || 'Server Error',
        data: err.data || null,
        error: {
            error_code: err.error?.error_code || 'PROCESS_ERROR',
            error_data: err.error_data || null,
        }
    })
}

export default errorHandler;