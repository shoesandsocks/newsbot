/* eslint-disable no-console */
import express from 'express';
import SlackTokenHandler from '../app/SlackTokenHandler';
import { setSource, setTime } from './scheduler';
import { newsArrayDefault } from './newsArrayDefault';
import {
  formatSourcesForSlack,
  getNewsSources,
  cancel,
  actionObjects,
  replacer,
  chatPostMessage,
  getNews,
} from './utils';

// setup stuff
require('dotenv').config();

const slackTokenHandler = new SlackTokenHandler();
const router = express.Router();
let newsSources = newsArrayDefault;
getNewsSources('https://newsapi.org/v1/sources?language=en')
  .then(response => {
    newsSources = response;
  })
  .catch(error => console.log(error));

/**
 * INSTALL NEW TEAM
 */
router.get('/install', slackTokenHandler.storeToken);

/**
 * SLASH COMMAND HANDLER... /news [help], /news [source], /news
 */
router.post('/news', (req, res) => {
  const { team_id, channel_id, user_id, text, response_url } = req.body;
  if (text === 'help') {
    chatPostMessage(team_id, user_id, channel_id, 'help');
    return res.sendStatus(200);
  }
  if (text === 'sources') {
    const sourceNames = newsSources.map(n => ` ${n.value}`);
    return res.json(replacer(`Valid source-codes include: ${sourceNames}`));
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
 * INTERACTIVE MESSAGE HANDLER (i.e., news source selection, buttons)
 */
router.post('/response', (req, res) => {
  const { user, team, channel, callback_id, actions, token, response_url } = JSON.parse(
    req.body.payload,
  );
  if (process.env.SLACK_VERIFICATION_TOKEN !== token) {
    return res.status(403);
  }
  switch (callback_id) {
    case 'dismiss':
      return res.json(replacer('Okay. Forget it.'));
    case 'change_schedule': {
      const yN = actions[0].value;
      if (yN === 'No') return res.json(replacer('Okay. Maybe some other time.'));
      return res.json(formatSourcesForSlack(newsSources));
    }
    case 'source_selection_slash': {
      const source = actions[0].selected_options[0].value;
      getNews(source, process.env.NEWS_KEY, response_url);
      break;
    }
    case 'source_selection_': {
      const source_ = actions[0].selected_options[0].value;
      setSource(user, team, channel.id, source_, response_url);
      break;
    }
    case 'schedule_selection': {
      const time = actions[0].selected_options[0].value;
      setTime(user, team, time, response_url);
      break;
    }
    case 'sure_to_cancel': {
      const yN = actions[0].value;
      if (yN === 'No') return res.json(replacer('Okay. Leaving it as-is.'));
      cancel(team.id, user.id, channel.id);
      break;
    }
    default:
      break;
  }
  return res.sendStatus(200);
});
/**
 * EVENTS ENDPOINT (a/k/a bot watcher)
 * https://api.slack.com/apps/A6BEWBXHN/event-subscriptions
 */
router.post('/events', (req, res) => {
  const { token, api_app_id, challenge, team_id, event, type } = req.body;
  // this check must be first
  if (challenge && type === 'url_verification') {
    return res.json({ challenge });
  }
  // security check; ensure various Slack tokens match.
  if (token !== process.env.SLACK_VERIFICATION_TOKEN || api_app_id !== process.env.SLACK_APP_ID) {
    return res.sendStatus(403);
  }
  // ignore slash-commands, bot postings, and non-message events
  if (
    (event.text && event.text.match(/^\//)) ||
    (event.subtype && event.subtype !== 'message') ||
    event.bot_id
  ) {
    return res.sendStatus(200);
  }
  // Keyword matching. (see ./utils file's actions and actionObject)
  let actionKeyword = '';
  actionObjects.forEach(o => {
    if (o.array.some(t => event.text.indexOf(t) > -1)) {
      actionKeyword = o.action;
    }
  });
  chatPostMessage(team_id, event.user, event.channel, actionKeyword); // TODO: move this up one line?
  return res.sendStatus(200);
});

export default router;
