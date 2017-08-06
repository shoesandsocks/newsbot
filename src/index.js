import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import cron from 'node-cron';
import routes from './routes';
import { getSchedules } from './scheduler';
import { sendNews } from './news';
/**
 * setup dotenv, express, express-session
 */
require('dotenv').config();

const port = process.env.PORT;
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGO, { useMongoClient: true });
/**
 * serve routes, static /public folder, and start server
 */
app.use(routes);
app.use(express.static(path.join(__dirname, '../public')));
app.listen(port, () => console.log(`on ${port}`)); // eslint-disable-line

/**
 * auto-scheduler things
 */
let allSchedules = [];
const refreshSchedules = () => {
  allSchedules = [];
  return new Promise((resolve, reject) => {
    getSchedules().then(allTeams => {
      allTeams.forEach(oneTeam => {
        oneTeam.forEach(uniqueSched => {
          allSchedules.push(uniqueSched);
        });
      });
      resolve(allSchedules);
      reject('hello');
    });
  });
};

const morningTask = cron.schedule(
  '0 8 * * *',
  () => {
    refreshSchedules().then(sked => {
      sked.forEach(a => {
        if (a.time === 'morning' || a.time === 'thrice daily') {
          sendNews(a.source, a.dm, process.env.NEWS_KEY, a.team);
        }
      });
    });
  },
  true,
);
const midTask = cron.schedule(
  '0 12 * * *',
  () => {
    refreshSchedules().then(sked => {
      sked.forEach(a => {
        if (a.time === 'midday' || a.time === 'thrice daily') {
          sendNews(a.source, a.dm, process.env.NEWS_KEY, a.team);
        }
      });
    });
  },
  true,
);
const eveningTask = cron.schedule(
  '0 20 * * *',
  () => {
    refreshSchedules().then(sked => {
      sked.forEach(a => {
        if (a.time === 'evening' || a.time === 'thrice daily') {
          sendNews(a.source, a.dm, process.env.NEWS_KEY, a.team);
        }
      });
    });
  },
  true,
);
