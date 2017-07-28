/* eslint-disable no-console */
import express from 'express';
import bot from './bot';
import SlackTokenHandler from '../app/SlackTokenHandler';
import { nevermind } from './responses';
import { getNewsSources, formatSourcesForSlack, getNews, showTasks } from './news';
import { setSource, setTime } from './scheduler';

// setup stuff
const slackTokenHandler = new SlackTokenHandler();
const router = express.Router();
let newsSources = {};
getNewsSources('https://newsapi.org/v1/sources?language=en').then(response => {
  newsSources = response;
});

/**
 * install route
 */
router.get('/install', slackTokenHandler.storeToken);
/**
 * send news
 */
router.post('/news', (req, res) => {
  if (!newsSources.length) {
    return res.json({ text: 'News is initializing. Try again.' });
  }
  return res.json(formatSourcesForSlack(newsSources, 'slash'));
});
/**
 * Endpoint for interactive messages (i.e., news source selection, buttons)
 */
router.post('/response', (req, res) => {
  // console.log(JSON.parse(req.body.payload));
  const { user, team, channel, callback_id, actions, token, response_url } = JSON.parse(
    req.body.payload
  );
  if (process.env.SLACK_VERIFICATION_TOKEN !== token) {
    return res.status(403);
  }
  // if its a response from SLASH-COMMAND news-select interx-msg...
  if (callback_id === 'source_selection_slash') {
    const source = actions[0].selected_options[0].value;
    getNews(source, process.env.NEWS_KEY, response_url);
    return res.sendStatus(200);
  }
  // if its a Y/N from the 'set a schedule?' buttons...
  if (callback_id === 'change_schedule') {
    const yN = actions[0].value;
    if (yN === 'No') {
      return res.json(nevermind('Okay. Maybe some other time.'));
    }
    return res.json(formatSourcesForSlack(newsSources));
  }
  // if an interactive request to set a source during scheduling:
  if (callback_id === 'source_selection_') {
    const source = actions[0].selected_options[0].value;
    setSource(user, team, channel.id, source, response_url);
    return res.json({ text: 'setting source' });
  }
  if (callback_id === 'schedule_selection') {
    console.log(JSON.parse(req.body.payload).actions[0].selected_options[0].value);
    const time = actions[0].selected_options[0].value;
    setTime(user, team, time, response_url);
    return res.sendStatus(200);
  }
  if (callback_id === 'dismiss') {
    return res.json(nevermind('Okay. Forget it.'));
  }
  return false; // linter
});

/**
 * EVENTS ENDPOINT (a/k/a bot watcher)
 *
 * Events received are controlled by Events API 'subscribe to bot events':
 * https://api.slack.com/apps/A6BEWBXHN/event-subscriptions
 *
 */
router.post('/events', (req, res) => {
  console.log('---------REQ.BODY.EVENT-----------');
  console.log(req.body);
  console.log('------------^-END-^---------------');
  const { token, api_app_id, challenge, team_id, event, type } = req.body;
  if (
    token !== process.env.SLACK_VERIFICATION_TOKEN ||
    api_app_id !== process.env.SLACK_APP_ID
  ) {
    return res.sendStatus(403);
  }
  if (challenge && type === 'url_verification') {
    return res.json({ challenge });
  }
  // TODO: in lieu of next 10 lines, just watch for array of [help, news, setup, etc] keywords?
  if (
    (event.text && event.text.match(/^\//)) ||
    (event.subtype && event.subtype !== 'message') ||
    event.bot_id
  ) {
    return res.sendStatus(200);
  }
  if (event.text === 'tasklist') {
    showTasks(team_id, event.user, event.channel);
    return res.sendStatus(200);
  }
  bot(team_id, event);
  return res.sendStatus(200);
});

export default router;
