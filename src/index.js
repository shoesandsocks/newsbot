import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import routes from './routes';
// vvvv this import starts the cron jobs...
import { morningTask, midTask, eveningTask, twoMinTask } from './scheduler'; // eslint-disable-line

require('dotenv').config();

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGO, { useMongoClient: true });

const port = process.env.PORT;
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(routes);
app.use(express.static(path.join(__dirname, '../public')));
app.listen(port, () => console.log(`on ${port}`)); // eslint-disable-line
