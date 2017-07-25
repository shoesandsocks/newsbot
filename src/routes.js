import express from 'express';
import axios from 'axios';
import SlackTokenHandler from '../app/SlackTokenHandler';
import loadNews from './news';

// setup stuff
const slackTokenHandler = new SlackTokenHandler();
const router = express.Router();

let newsSources = [];
(async function getNews() {
  loadNews('https://newsapi.org/v1/sources?language=en')
    .then(response => {
      newsSources = response;
    });
}());

/**
 * begin routes
 */
// duh
router.get('/install', slackTokenHandler.storeToken);

// slash-cmd call to start
router.post('/news', (req, res) => {
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
router.post('/response', (req, res) => {
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

export default router;
