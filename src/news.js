/* eslint-disable no-nested-ternary, no-console */
import axios from 'axios';
import qs from 'qs';
import cron from 'node-cron';
import Token from '../app/tokens';

const task = {};

const genericPost = (params, source, dm = '') =>
  axios
    .post(`https://www.slack.com/api/chat.postMessage?${params}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    .then(() => console.log(`posted scheduled news from ${source} to ${dm} at ${new Date()}`)
    )
    .catch(e => console.log(`error posting response to slack: ${e}`));

export const getNewsSources = url =>
  new Promise(
    resolve => {
      const newsSources = [];
      axios
        .get(url)
        .then(response => {
          response.data.sources.forEach(item => {
            newsSources.push({
              text: item.name,
              value: item.id,
            });
          });
          resolve(newsSources);
        })
        .catch(error => {
          console.log(error);
        });
    },
    reject => {
      reject({ news: 'source ' });
    }
  );

export const formatSourcesForSlack = (sources, context = '') => {
  const slackObject = {};
  slackObject.response_type = 'in_channel';
  slackObject.text = '';
  slackObject.attachments = [
    {
      text: 'Choose a news source:',
      fallback: 'News source selector',
      color: '#3AA3E3',
      attachment_type: 'default',
      callback_id: `source_selection_${context}`,
      actions: [
        {
          name: 'source_list',
          text: 'Pick a source...',
          type: 'select',
          options: sources,
        },
      ],
    },
    {
      text: '',
      fallback: 'Dismiss',
      color: '##939393',
      attachment_type: 'default',
      callback_id: 'dismiss',
      actions: [
        {
          name: 'dismiss',
          text: 'Nevermind',
          type: 'button',
          value: 'dismiss',
        },
      ],
    },
  ];
  return slackObject;
};
export const schedulePicker = () => {
  const slackObject = {};
  slackObject.replace_original = true;
  slackObject.text = '';
  slackObject.attachments = [
    {
      text: 'When do you want your headlines delivered?',
      fallback: 'Time selector',
      color: '#3AA3E3',
      attachment_type: 'default',
      callback_id: 'schedule_selection',
      actions: [
        {
          name: 'schedule_list',
          text: 'Pick a source...',
          type: 'select',
          options: [
            {
              text: 'Mornings',
              value: 'mornings',
            },
            {
              text: 'Mid-day',
              value: 'mid_day',
            },
            {
              text: 'Evenings',
              value: 'evenings',
            },
            {
              text: 'All three',
              value: 'all_three',
            },
          ],
        },
      ],
    },
    {
      text: '',
      fallback: 'Dismiss',
      color: '##939393',
      attachment_type: 'default',
      callback_id: 'dismiss_times',
      actions: [
        {
          name: 'dismiss',
          text: 'Nevermind',
          type: 'button',
          value: 'dismiss',
        },
      ],
    },
  ];
  return slackObject;
};
export const getNews = (source, key, response_url) => {
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
        .then(() => console.log(`posted oneoff news from ${source} at ${new Date()}`))
        .catch(() => console.log('error posting response to slack'));
    })
    .catch(e => console.log(`error getting news from newsAPI: ${e}`));
};
export const startNews = (source, id, time, dm, key, team_id) => {
  let bot_user_token = '';
  Token.findOne({ team_id }, (err, token) => {
    if (err) console.log(err);
    bot_user_token = token.bot.bot_access_token;
  });
  axios
    .get(`https://newsapi.org/v1/articles?source=${source}&apiKey=${key}`)
    .then(reply => {
      const atts = [];
      reply.data.articles.forEach(a => {
        atts.push({
          fallback: 'a news headline',
          text: `${a.description
            ? a.description.length > 100
              ? a.description.substr(0, 100)
              : a.description
            : ''}`,
          title_link: a.url,
          title: a.title,
          thumb_url: a.urlToImage,
          color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        });
      });
      const jsonAttachments = JSON.stringify(atts);
      const params = qs.stringify({
        token: bot_user_token,
        channel: dm,
        icon_emoji: ':newspaper:',
        text: `The latest headlines from ${source}`,
        attachments: jsonAttachments,
      });
      if (time === 'mornings') {
        task[id] = cron.schedule('0 8 * * *', () =>
          genericPost(params, source, dm)
        );
      } else if (time === 'mid-day') {
        task[id] = cron.schedule('0 12 * * *', () =>
          genericPost(params, source, dm)
        );
      } else if (time === 'evenings') {
        task[id] = cron.schedule('0 18 * * *', () =>
          genericPost(params, source, dm)
        );
      } else if (time === 'all_three') {
        task[id] = cron.schedule('12,13,14,15,16,17 23 * * *', () =>
          genericPost(params, source, dm)
        );
      }
    })
    .catch(e => console.log(`error getting news from newsAPI: ${e}`));
};
export const showTasks = (team_id, user_id, channel) =>
  Token.findOne({ team_id }, (err, token) => {
    let userSchedule = {};
    let bot_user_token = '';
    if (!err) {
      userSchedule = token.schedules.filter(s => s.id === user_id)[0];
      bot_user_token = token.bot.bot_access_token;
    }
    let text = 'You have no automatic news schedule set (or something bad happened).';
    if (userSchedule.source) {
      text = `You're getting ${userSchedule.source} headlines in the ${userSchedule.time}`;
    }
    const params = qs.stringify({ token: bot_user_token, text, channel });
    axios
      .post(`https://www.slack.com/api/chat.postMessage?${params}`, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
      .then(() => console.log('task posted'))
      .catch(() => console.log('task posting error'));
  });
