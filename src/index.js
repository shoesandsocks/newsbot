/* eslint-disable no-console */

import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import session from 'express-session';
import mongoose from 'mongoose';
import axios from 'axios';
import SlackTokenHandler from '../app/SlackTokenHandler';

/**
 * setup dotenv, express, and slack-token stuff
 */
const slackTokenHandler = new SlackTokenHandler();
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
 * get news sources
 */
const newsSources = [];
axios
  .get('https://newsapi.org/v1/sources?language=en')
  .then(response => {
    response.data.sources.forEach(item => {
      newsSources.push({
        text: item.name,
        value: item.id,
      });
    });
  })
  .catch(error => {
    console.log(error);
  });

/**
 * begin routes
 */
// duh
app.get('/install', slackTokenHandler.storeToken);

// slash-cmd call to start
app.post('/news', (req, res) => {
  if (!newsSources.length) {
    return res.json({ text: 'News is initializing. Try again.' });
  }
  const slackObject = {};
  slackObject.response_type = 'in_channel';
  slackObject.text = '';
  slackObject.attachments = [
    {
      text: 'Choose a news source:',
      fallback: 'News source selector',
      color: '#3AA3E3',
      attachment_type: 'default',
      callback_id: 'source_selection',
      actions: [
        {
          name: 'source_list',
          text: 'Pick a source...',
          type: 'select',
          options: newsSources,
        },
      ],
    },
  ];
  return res.json(slackObject);
});

// endpoint for interactive message coming back
app.post('/response', (req, res) => {
  const { actions, token, response_url } = JSON.parse(req.body.payload);
  const source = actions[0].selected_options[0].value;
  const key = process.env.NEWS_KEY;
  if (process.env.SLACK_VERIFICATION_TOKEN !== token) {
    return res.status(403);
  }
  res.sendStatus(200);
  const newsMessage = {
    icon_emoji: ':newspaper:',
    text: `The latest headlines from ${source}`,
    attachments: [],
  };
  axios
    .get(`https://newsapi.org/v1/articles?source=${source}&apiKey=${key}`)
    .then(reply => {
      reply.data.articles.forEach(a => {
        newsMessage.attachments.push({
          fallback: 'a news headline',
          text: a.description,
          title_link: a.url,
          title: a.title,
          thumb_url: a.urlToImage,
          color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        });
      });
      axios
        .post(response_url, newsMessage)
        .then(() => console.log(`posted news from ${source} at ${new Date()}`))
        .catch(() => console.log('error posting response to slack'));
    });
  return true; // linter
});

/**
 * serve static /public folder and start server
 */
app.use(express.static(path.join(__dirname, '../public')));
app.listen(port, () => console.log(`on ${port}`));
