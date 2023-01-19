import express, { Express, Request, Response } from 'express';
import { sendError, sendResponse } from './libraries/rest';
import dotenv from 'dotenv';
import http from 'http';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import errorHandler from './middleware/error';
import country from '../prisma/config/countrycodes.json';

dotenv.config();

const app: Express = express();
const port: number = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

import { viewImages } from './controllers/v1/utils';
app.get('/public/images/:type/:slug', viewImages);
app.use('/avatar', express.static('public/avatar'));
app.use('/country', express.static('public/country'));

app.use('/public/videos', express.static('public/videos'));

app.use(cors({
    origin: function (origin, callback) {
        callback(null, true)
    },
    credentials: true
}));


// API V1
import auth from './routes/v1/auth';
import user from './routes/v1/users';
import comunities from './routes/v1/comunities';
import post from './routes/v1/posts';
import utils from './routes/v1/utils';
import notification from './routes/v1/notifications';
import payment from './routes/v1/payments';
import analytic from './routes/v1/analytics';
import interest from './routes/v1/interest';
import handleAPI from './routes/v1/handleAPI';
import cache from './middleware/cache';

app.use('/api/v1/auth', auth);
app.use('/api/v1/user', user);
app.use('/api/v1/group', comunities);
app.use('/api/v1/post', post);
app.use('/api/v1/notification', notification);
app.use('/api/v1/payment', payment);
app.use('/api/v1/analytics', analytic);
app.use('/api/v1/utils', utils);
app.use('/api/v1/interest', interest);
app.use('/api/v1/handle', handleAPI);

app.get('/api/v1/country', cache(60), (req: Request, res: Response) => {
    const myurl = req.protocol + '://' + req.get('host');
    const data = country.map((item: any) => {
        return {
            name: item.name,
            dial_code: item.dial_code,
            code: item.code,
            flag: `${myurl}/country/${item.code}.svg`
        }
    })

    return res.status(200).json(new sendResponse(data, 'Country found', {}, 200));
})

app.use(errorHandler);
const server = http.createServer(app);
app.get('*', (req: Request, res: Response) => {
    res.status(404).json(new sendError('Not Found', [], 'NOT_FOUND', 404));
})

app.post('*', (req: Request, res: Response) => {
    res.status(404).json(new sendError('Not Found', [], 'NOT_FOUND', 404));
})

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});