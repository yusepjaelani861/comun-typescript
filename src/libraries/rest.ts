export class sendResponse {
    success: boolean = true;
    data: any;
    error: {
        error_code: string,
        error_data: string,
    }
    message: string = 'Success getting data';
    pagination: any = {};
    constructor(data: Object, message: string, pagination: any, status: number) {
        this.success = true;
        this.message = message;
        this.data = data;
        this.error = {
            error_code: '',
            error_data: '',
        }
        this.pagination = pagination;
    }
}

export class sendError {
    success: boolean = false;
    data: String | null;
    error: {
        error_code: string | 'PROCESS_ERROR',
        error_data: string | Array<any>,
    }
    message: string = 'Success getting data';
    pagination: any = {};
    constructor(message: string, error_data: Array<any>, error_code: string, status: number) {
        this.success = false;
        this.message = message;
        this.data = null;
        this.error = {
            error_code: error_code,
            error_data: error_data,
        }
        this.pagination = {};
    }
}