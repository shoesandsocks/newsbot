/* eslint-disable camelcase, no-console */
import axios from 'axios';

export const getNewsSources = (url) =>
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

export const formatSourcesForSlack = (sources) => {
  const slackObject = {};
  slackObject.response_type = 'in_channel';
  slackObject.text = '';
  slackObject.attachments = [
    {
      text: 'Choose a news source:',
      fallback: 'News source selector',
      color: '#3AA3E3',
      attachment_type: 'default',
      callback_id: 'source_selection',
      actions: [
        {
          name: 'source_list',
          text: 'Pick a source...',
          type: 'select',
          options: sources,
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
        .then(() => console.log(`posted news from ${source} at ${new Date()}`))
        .catch(() => console.log('error posting response to slack'));
    });
};
