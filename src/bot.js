/* eslint-disable no-console */
import axios from 'axios';
import qs from 'qs';
import Token from '../app/tokens';

require('dotenv').config();

export default function bot(team_id, event) {
  const botTokenPromise = Token.findOne({ team_id }).exec();
  botTokenPromise
    .then(token => {
      const bot_user_token = token.bot.bot_access_token;
      let text = '';
      let params = {};
      // already running a schedule?
      if (!token.schedule) {
        // const thread_ts = event.thread_ts ? event.thread_ts : event.ts;
        text = 'You don\'t have a scheduled news service. Do you want to set one?';
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
        params = qs.stringify({
          token: bot_user_token,
          text,
          channel: event.channel,
          // thread_ts,
          attachments: jsonAttachments,
        });
      }
      axios.post(`https://www.slack.com/api/chat.postMessage?${params}`, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
        .then(() => console.log('bot posted'))
        .catch(() => console.log('bot posting error'));
    })
    .catch(() => console.log('team_id not found in database'));
}
