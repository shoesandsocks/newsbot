/* eslint-disable no-console, no-param-reassign */
import axios from 'axios';
import qs from 'qs';
import Token from '../app/tokens';

const helpWords = ['hello', 'help', 'hi', 'hey', 'bot', 'newsbot'];
const statusWords = ['remind', 'news', 'get', 'status'];
const startScheduling = ['schedule', 'setup', 'start'];
const quitScheduling = ['cancel', 'quit', 'stop', 'end'];
const changeScheduling = ['change', 'revise', 'modify', 'alter'];
const danceWords = ['boogie', 'dance', 'break it down for me fellas'];

export const actionObjects = [
  { array: helpWords, action: 'help' },
  { array: statusWords, action: 'show-tasks' },
  { array: startScheduling, action: 'start' },
  { array: quitScheduling, action: 'cancel' },
  { array: changeScheduling, action: 'change' },
  { array: danceWords, action: 'dance' },
];

const ynButtons = cbName =>
  JSON.stringify([
    {
      text: '',
      fallback: 'Something\'s wrong',
      callback_id: cbName,
      color: '#3AA3E3',
      attachment_type: 'default',
      actions: [
        {
          name: cbName,
          text: 'Yes',
          type: 'button',
          value: 'Yes',
        },
        {
          name: cbName,
          text: 'No',
          type: 'button',
          value: 'No',
        },
      ],
    },
  ]);

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
              value: 'morning',
            },
            {
              text: 'Midday',
              value: 'midday',
            },
            {
              text: 'Evenings',
              value: 'evening',
            },
            {
              text: 'All three',
              value: 'thrice daily',
            },
            {
              text: 'Every 2 mins ( 🙏🏽  Brief tests! 👍🏽) ',
              value: 'every two minutes',
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
export const paramsGenerator = (action, schedule) => {
  let text = '';
  switch (action) {
    case 'show-tasks':
      if (schedule) {
        text =
          `You're getting ${schedule.time} headlines from ${schedule.source}. ` +
          'To cancel this news schedule, type `cancel`. To change, type `change`.';
      } else {
        text =
          'You have no automatic news schedule set.\nType `schedule` to start a new schedule or `help` for more....';
      }
      text += ' To get the news now, use the slash-command `/news`.';
      return { text, attachments: '' };
    case 'start':
      if (schedule) {
        text = 'You already have a schedule; do you want to change it?';
      } else {
        text = 'You don\'t have a scheduled news service. Do you want to set one?';
      }
      return { text, attachments: ynButtons('change_schedule') };
    case 'change':
      if (schedule) {
        text = 'Do you want to change your scheduled news service?';
      } else {
        text = 'You have no schedule to change. Do you want to set one?';
      }
      return { text, attachments: ynButtons('change_schedule') };
    case 'help':
      return {
        text:
          'Hello! This is a newsbot that can send selected headlines to you. Type `schedule` to get ' +
          'started. Once your schedule is set, type `remind me`, `cancel` or `change` at any time. Get headlines ' +
          'whenever you want with the slash-command `/news`.\n\n',
        attachments: '',
      };
    case 'cancel':
      if (schedule) {
        return {
          text: 'Are you sure you want to cancel your schedule?',
          attachments: ynButtons('sure_to_cancel'),
        };
      }
      return {
        text: 'You have no schedule to cancel. Did you want to set one up?',
        attachments: ynButtons('change_schedule'),
      };
    case 'really-cancel':
      return {
        text: 'Your schedule is deleted.',
        attachments: '',
      };
    case 'dance':
      return {
        text: 'it\'s electric. oogie woogie woogie.',
        attachments: ''
      };
    default:
      return {
        text: 'How did you get here?',
        attachments: '',
      };
  }
};
export const post = params =>
  axios
    .post(`https://www.slack.com/api/chat.postMessage?${params}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    .then(() => console.log('reply ok'))
    .catch(error => console.log(error));

export const getNewsSources = url =>
  new Promise(
    resolve => {
      const newsSources = [];
      axios
        .get(url)
        .then(response => {
          response.data.sources.forEach(item => {
            newsSources.push({
              text: `${item.name} (${item.id})`,
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
    },
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

export const replacer = string => ({
  response_type: 'in_channel',
  replace_original: true,
  text: string,
});

export function chatPostMessage(team, user, channel, action) {
  const botTokenPromise = Token.findOne({ team_id: team }).exec();
  botTokenPromise
    .then(token => {
      const currentSchedule = token.schedules.filter(s => s.id === user)[0];
      const { text, attachments } = paramsGenerator(action, currentSchedule);
      const uniqueTeamBotToken = token.bot.bot_access_token;
      const params = qs.stringify({ token: uniqueTeamBotToken, text, channel, attachments });
      return post(params);
    })
    .catch(error => console.log(`chatPostMessage failed at ${action}: ${error}`));
}

export const cancel = (team_id, user_id, channel) => {
  const tokenPromise = Token.findOne({ team_id }).exec();
  tokenPromise.then(token => {
    const schedules = token.schedules.filter(s => s.id !== user_id); // filter out old entry
    token.schedules = schedules;
    token.markModified('schedules'); // just in case?
    token.save();
    chatPostMessage(team_id, user_id, channel, 'really-cancel');
  });
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
export const sendNews = (source, dm, key, team_id) => {
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
            ? a.description.length > 100 ? a.description.substr(0, 100) : a.description
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
      post(params);
    })
    .catch(e => console.log(`error getting news from newsAPI: ${e}`));
};
