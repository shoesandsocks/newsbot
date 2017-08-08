/* eslint-disable no-console, no-param-reassign */
import axios from 'axios';
import cron from 'node-cron';
import Token from '../app/tokens';
import { schedulePicker, sendNews } from './utils';

export const setSource = (user, team, channel_string, source, response_url) => {
  const tokenPromise = Token.findOne({ team_id: team.id }).exec();
  tokenPromise.then(token => {
    const schedules = token.schedules.filter(ns => ns.id !== user.id); // filter out old entry
    const newSchedule = { source, id: user.id, time: '', dm: channel_string, team: team.id };
    schedules.push(newSchedule);
    token.schedules = schedules;
    token.save();
    axios.post(response_url, schedulePicker());
  });
};

export const setTime = (user, team, time, response_url) => {
  const tokenPromise = Token.findOne({ team_id: team.id }).exec();
  tokenPromise.then(token => {
    const newSchedule = token.schedules.filter(ns => ns.id === user.id)[0];
    newSchedule.time = time;
    const schedules = token.schedules.filter(ns => ns.id !== user.id); // filter out old entry
    schedules.push(newSchedule);
    token.schedules = schedules;
    token.markModified('schedules'); // ! b/c empty array in schema
    token.save();
    axios.post(response_url, {
      text:
        `You're all set. Scheduled ${time} delivery of ${newSchedule.source} headlines.\n` +
        'Cancel anytime with `cancel`; change by typing `change`.',
    });
  });
};

const getSchedules = () =>
  new Promise((resolve, reject) => {
    Token.find({}, (err, tokens) => {
      if (err) reject('problemz.');
      const map = tokens.map(token => token.schedules);
      resolve(map);
    });
  });

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

export const morningTask = cron.schedule(
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
export const midTask = cron.schedule(
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
export const eveningTask = cron.schedule(
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
export const twoMinTask = cron.schedule(
  '*/2 * * * *',
  () => {
    refreshSchedules().then(sked => {
      sked.forEach(a => {
        if (a.time === 'every two minutes') {
          sendNews(a.source, a.dm, process.env.NEWS_KEY, a.team);
        }
      });
    });
  },
  true,
);
