import { sendResponse, sendError } from "../../../libraries/rest";
import { NextFunction, Request, Response } from "express";
import asyncHandler from "../../../middleware/async";
import axios from "axios";

export const sendWhatsapp = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const {
        data
    }  = req.body;

    if (!data) {
        return next(new sendError('Data not found', [], 'NOT_FOUND', 404));
    }

    const url = process.env.WHATSAPP_API_URL || ''
    await axios.post(url, {
        number: '62895389925850@c.us',
        message: `Error: \n\n${data}`
    }, {
        headers: {
            'Accept': 'application/json'
        }
    })

    return res.status(200).json(new sendResponse(data, 'Whatsapp sent', {}, 200));
})