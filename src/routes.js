import express from 'express';
import SlackTokenHandler from '../app/SlackTokenHandler';
import { getNewsSources, formatSourcesForSlack, getNews } from './news';

// setup stuff
const key = process.env.NEWS_KEY;
const slackTokenHandler = new SlackTokenHandler();
const router = express.Router();
let newsSources = [];
getNewsSources('https://newsapi.org/v1/sources?language=en')
  .then(response => {
    newsSources = response;
  });

/**
 * begin routes
 */
router.get('/install', slackTokenHandler.storeToken);

router.post('/news', (req, res) => {
  if (!newsSources.length) {
    return res.json({ text: 'News is initializing. Try again.' });
  }
  const slackObject = formatSourcesForSlack(newsSources);
  return res.json(slackObject);
});

// endpoint for interactive message coming back
router.post('/response', (req, res) => {
  const { actions, token, response_url } = JSON.parse(req.body.payload);
  const source = actions[0].selected_options[0].value;
  if (process.env.SLACK_VERIFICATION_TOKEN !== token) {
    return res.status(403);
  }
  // send info off to fn, to have news posted to slack
  getNews(source, key, response_url);
  return res.sendStatus(200);
});

export default router;
