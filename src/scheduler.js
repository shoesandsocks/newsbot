/* eslint-disable no-console */
import axios from 'axios';
// import qs from 'qs';
import Token from '../app/tokens';
import { schedulePicker } from './news';

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

export function getSchedules() {
  return new Promise((resolve, reject) => {
    Token.find({}, (err, tokens) => {
      if (err) reject('problemz.');
      const map = tokens.map(token => token.schedules);
      resolve(map);
    });
  });
}
