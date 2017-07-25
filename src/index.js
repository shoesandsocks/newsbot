/* eslint-disable no-console */

import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import session from 'express-session';
import mongoose from 'mongoose';
import routes from './routes';

/**
 * setup dotenv, express
 */

require('dotenv').config();

const port = process.env.PORT;
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

/**
 * connect to mLab with mongoose
 */
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGO, { useMongoClient: true });

/**
 * serve routes, static /public folder, and start server
 */
app.use(routes);
app.use(express.static(path.join(__dirname, '../public')));
app.listen(port, () => console.log(`on ${port}`));
