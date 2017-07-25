import axios from 'axios';

export default url =>
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
