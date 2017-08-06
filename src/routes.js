/* eslint-disable no-console */
import express from 'express';
import { start, quit, help } from './bot';
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
    req.body.payload,
  );
  if (process.env.SLACK_VERIFICATION_TOKEN !== token) {
    return res.status(403);
  }
  switch (callback_id) {
    case 'source_selection_slash': {
      const source = actions[0].selected_options[0].value;
      getNews(source, process.env.NEWS_KEY, response_url);
      break;
    }
    case 'change_schedule': {
      const yN = actions[0].value;
      if (yN === 'No') {
        return res.json(nevermind('Okay. Maybe some other time.'));
      }
      return res.json(formatSourcesForSlack(newsSources));
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
    case 'dismiss':
      return res.json(nevermind('Okay. Forget it.'));
    default:
      return res.sendStatus(200);
  }
  return res.sendStatus(200);
});

/**
 * EVENTS ENDPOINT (a/k/a bot watcher)
 *
 * Events received are controlled by Events API 'subscribe to bot events':
 * https://api.slack.com/apps/A6BEWBXHN/event-subscriptions
 *
 */
router.post('/events', (req, res) => {
  // console.log('---------REQ.BODY.EVENT-----------');
  // console.log(req.body);
  // console.log('------------^-END-^---------------');
  const { token, api_app_id, challenge, team_id, event, type } = req.body;
  // this check must be first, since many other vars are undefined if
  // slack is doing a challenge check
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
  /**
   * Begin actual keyword matching. Arrays and the .some() method used to trigger imported fns.
   *
   */
  const helpWords = ['hello', 'help', 'hi', 'bot', 'newsbot'];
  if (helpWords.some(t => event.text.indexOf(t) > -1)) {
    console.log('saw -hello- -quit- -hi- or -bot-, -newsbot-');
    help(event.user, team_id, event.channel);
    return res.sendStatus(200);
  }
  const triggers = ['remind', 'news', 'get'];
  if (triggers.some(t => event.text.indexOf(t) > -1)) {
    console.log('saw -remind- -news- or -get-');
    showTasks(team_id, event.user, event.channel);
    return res.sendStatus(200);
  }
  const startScheduling = ['schedule', 'setup', 'start'];
  if (startScheduling.some(t => event.text.indexOf(t) > -1)) {
    console.log('saw -news- -schedule- -setup- or -start-');
    start(team_id, event);
    return res.sendStatus(200);
  }
  const quitScheduling = ['cancel', 'quit', 'stop', 'end'];
  if (quitScheduling.some(t => event.text.indexOf(t) > -1)) {
    console.log('saw -cancel- -quit- -stop- or -end-');
    quit(event.user, team_id, event.channel);
    return res.sendStatus(200);
  }
  const changeScheduling = ['change', 'revise', 'modify', 'alter'];
  if (changeScheduling.some(t => event.text.indexOf(t) > -1)) {
    console.log('saw -change- -revise- -modify- or -alter-');
    start(team_id, event, true); // 'changeFlag' at 3rd argv
    return res.sendStatus(200);
  }
  return res.sendStatus(200);
});

export default router;
