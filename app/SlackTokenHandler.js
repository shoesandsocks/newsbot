/* eslint-disable camelcase, no-console */
import slack from 'slack';
import Token from './tokens';

require('dotenv').config();

// TODO: 
// create a state-checker for extra security

function SlackTokenHandler() {
  this.storeToken = function storeToken(req, res) {
    const client_id = process.env.SLACK_CLIENT_ID;
    const client_secret = process.env.SLACK_CLIENT_SECRET;
    const code = req.query.code;
    slack.oauth.access({ client_id, client_secret, code }, (err, data) => {
      if (err) {
        console.error(err);
      }
      const tokenPromise = Token.findOne({ access_token: data.access_token }).exec();
      tokenPromise.then((token) => {
        if (token) {
          console.log('Team already installed app.');
          res.redirect(`http://${data.team_name}.slack.com`);
        } else {
          const newToken = new Token();
          newToken.access_token = data.access_token;
          newToken.scope = data.scope;
          newToken.user_id = data.user_id;
          newToken.team_name_name = data.team_name;
          newToken.team_id = data.team_id;
          newToken.bot = data.bot;
          newToken.save();
          res.redirect(`http://${data.team_name}.slack.com`);
        }
      });
    });
  };
}

export default SlackTokenHandler;
