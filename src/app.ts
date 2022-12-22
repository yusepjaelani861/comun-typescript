import express, { ErrorRequestHandler, Express, NextFunction, Request, Response } from 'express';
import dotenv from 'dotenv';
import http from 'http';
import cors from 'cors';
// import 'express-async-errors';
import errorHandler from './middleware/error';

dotenv.config();

const app: Express = express();
const port: number = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: '*',
    credentials: true,
}));

import authentication from './routes/v1/auth/authentication';
import user from './routes/v1/users';
import comunities from './routes/v1/comunities';
import post from './routes/v1/posts';

app.use('/api/v1/auth', authentication);
app.use('/api/v1/user', user);
app.use('/api/v1/group', comunities);
app.use('/api/v1/post', post);

app.get('/', (req: Request, res: Response) => {
    res.send('Hello World!');
});


app.use(errorHandler);
const server = http.createServer(app);

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});