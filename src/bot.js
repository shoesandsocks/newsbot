/* eslint-disable no-console */
import axios from 'axios';
import qs from 'qs';
import Token from '../app/tokens';
import { showTasks } from './news';

require('dotenv').config();

export function start(team_id, event, changeFlag = false) {
  const botTokenPromise = Token.findOne({ team_id }).exec();
  botTokenPromise
    .then(token => {
      let text = 'You don\'t have a scheduled news service. Do you want to set one?';
      if (changeFlag) {
        text = 'Do you want to change your scheduled news service?';
      }
      // already running a schedule (but not requested change)?
      const userSchedule = token.schedules.filter(s => s.id === event.user)[0];
      if (userSchedule && !changeFlag) {
        return showTasks(team_id, event.user, event.channel);
      }
      const bot_user_token = token.bot.bot_access_token;
      const jsonAttachments = JSON.stringify([
        {
          text: '',
          fallback: 'Something\'s wrong',
          callback_id: 'change_schedule',
          color: '#3AA3E3',
          attachment_type: 'default',
          actions: [
            {
              name: 'change_schedule',
              text: 'Yes',
              type: 'button',
              value: 'Yes',
            },
            {
              name: 'change_schedule',
              text: 'No',
              type: 'button',
              value: 'No',
            },
          ],
        },
      ]);
      const params = qs.stringify({
        token: bot_user_token,
        text,
        channel: event.channel,
        attachments: jsonAttachments,
      });
      return axios
        .post(`https://www.slack.com/api/chat.postMessage?${params}`, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
        .then(() => console.log('bot posted'))
        .catch(() => console.log('bot posting error'));
    })
    .catch(() => console.log('team_id not found in database'));
}

export function quit(user_id, team_id, channel) {
  const tokenPromise = Token.findOne({ team_id }).exec();
  tokenPromise.then(token => {
    const bot_user_token = token.bot.bot_access_token;
    const schedules = token.schedules.filter(s => s.id !== user_id); // filter out old entry
    const oldSchedule = token.schedules.filter(s => s.id === user_id)[0];
    token.schedules = schedules;
    token.markModified('schedules'); // just in case?
    token.save();
    const text =
      oldSchedule === undefined
        ? 'you didn\'t have a schedule to cancel...'
        : `Removed your ${oldSchedule.time} subscription to ${oldSchedule.source}. Type \`schedule\` to start a new schedule or \`help\` for more...`;
    const params = qs.stringify({
      token: bot_user_token,
      text,
      channel,
    });
    return axios
      .post(`https://www.slack.com/api/chat.postMessage?${params}`, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      .then(() => console.log('acknowledged schedule cancellation'))
      .catch(() => console.log('cencellation error'));
  });
}

export function help(user_id, team_id, channel) {
  const tokenPromise = Token.findOne({ team_id }).exec();
  tokenPromise.then(token => {
    const bot_user_token = token.bot.bot_access_token;
    const currentSchedule = token.schedules.filter(s => s.id === user_id)[0];
    const hasCurrentSchedule = currentSchedule !== undefined;
    let text =
      'Hello! This is a newsbot that can send selected headlines to you. Type `schedule` to get ' +
      'started. Once your schedule is set, type `cancel` or `change` at any time. Get headlines ' +
      'whenever you want with the slash-command `/news`.\n\n';
    text += hasCurrentSchedule
      ? `You currently have a ${currentSchedule.time} subscription to ${currentSchedule.source}.`
      : '';
    const params = qs.stringify({
      token: bot_user_token,
      text,
      channel,
    });
    return axios
      .post(`https://www.slack.com/api/chat.postMessage?${params}`, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      .then(() => console.log('acknowledged hello'))
      .catch(() => console.log('hello error'));
  });
}
