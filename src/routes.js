/* eslint-disable no-console */
import express from 'express';
import { newsArrayDefault } from './newsArrayDefault';
import { formatSourcesForSlack, getNewsSources, getNews } from './utils';

require('dotenv').config();

const router = express.Router();
let newsSources = newsArrayDefault; // backup in case getNewsSources() fails on next line

getNewsSources('https://newsapi.org/v1/sources?language=en')
  .then(response => {
    newsSources = response;
  })
  .catch(error => console.log(error));

/**
 * SLASH COMMAND HANDLER... /news [help], /news [source], /news
 */
router.post('/news', (req, res) => {
  const { text, response_url } = req.body;
  if (text === 'help') {
    return res.json({
      text:
        'Hello! This is a newsbot that can send selected headlines to you. ' +
        'Type the slash-command `/news` to get a menu of sources. If you know ' +
        'the short-code for a news source type `/news [code]` and skip the ' +
        'menu of sources. (To see a list of these sources, type `/news sources`)\n\n',
    });
  }
  if (text === 'sources') {
    const sourceNames = newsSources.map(n => ` ${n.value}`);
    return res.json({
      response_type: 'in_channel',
      replace_original: true,
      text: `Valid source-codes include: ${sourceNames}`,
    });
  }
  if (text.length > 0) {
    if (newsSources.some(s => s.text.indexOf(text) > -1)) {
      getNews(text, process.env.NEWS_KEY, response_url);
      return res.sendStatus(200);
    }
    return res.json({ text: 'Didn\'t recognize that news-code, sorry.' });
  }
  return res.json(formatSourcesForSlack(newsSources, 'slash'));
});

/**
 * INTERACTIVE MESSAGE HANDLER (i.e., news source selection, cancel button)
 */
router.post('/response', (req, res) => {
  const { callback_id, actions, token, response_url } = JSON.parse(req.body.payload);
  if (process.env.SLACK_VERIFICATION_TOKEN !== token) {
    return res.status(403);
  }
  if (callback_id === 'dismiss') {
    return res.json({
      response_type: 'in_channel',
      replace_original: true,
      text: 'Okay, forget it.',
    });
  }
  if (callback_id === 'source_selection_slash') {
    const source = actions[0].selected_options[0].value;
    return getNews(source, process.env.NEWS_KEY, response_url);
  }
  return res.sendStatus(200);
});

export default router;
