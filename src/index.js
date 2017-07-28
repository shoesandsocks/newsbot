import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import session from 'express-session';
import mongoose from 'mongoose';
import routes from './routes';
import { getSchedules } from './scheduler';
import { startNews } from './news';
/**
 * setup dotenv, express, express-session
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
 * connect to dB @ mLab with mongoose
 */
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
getSchedules().then(allTeams => {
  allTeams.forEach(oneTeam => {
    oneTeam.forEach(uniqueSched => {
      const { source, id, time, dm, team } = uniqueSched;
      if (source && id && time && dm && team) {
        startNews(source, id, time, dm, process.env.NEWS_KEY, team);
      }
    });
  });
});
