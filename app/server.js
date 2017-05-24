import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import botkit from 'botkit';
import dotenv from 'dotenv';
import yelp from 'yelp-fusion';

dotenv.config({ silent: true });

// initialize
const app = express();

// botkit controller
const controller = botkit.slackbot({
  debug: false,
});

// initialize slackbot
const slackbot = controller.spawn({
  token: process.env.SLACK_BOT_TOKEN,
  // this grabs the slack token we exported earlier
}).startRTM((err) => {
  // start the real time message client
  if (err) { throw new Error(err); }
});

// prepare webhook
// for now we won't use this but feel free to look up slack webhooks
controller.setupWebserver(process.env.PORT || 3001, (err, webserver) => {
  controller.createWebhookEndpoints(webserver, slackbot, () => {
    if (err) { throw new Error(err); }
  });
});

// yelp response
controller.hears(['hungry'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    if (res) {
      let yelpClient;
      yelp.accessToken(process.env.YELP_CLIENT_ID, process.env.YELP_CLIENT_SECRET)
        .then((res) => {
          yelpClient = yelp.client(res.jsonBody.access_token);
          yelpClient.search({
            term: 'Sushi',
            location: 'hanover, nh',
          }).then((response) => {
            response.jsonBody.businesses.forEach((business) => {
              // console.log(business);
              bot.reply(message, `try ${business.name}`);
            });
          }).catch((e) => {
            console.log(e);
          });
        })
        .catch((e) => {
          console.log(e);
        });
    } else {
      bot.reply(message, 'Looks like I\'m running into some trouble.');
    }
  });
});

// help response
controller.hears(['help'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    bot.reply(message, 'I can give you food recommendations. Tell me you\'re hungry.');
  });
});

// example hello response
controller.hears(['hello', 'hi', 'howdy'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    if (res) {
      bot.reply(message, `Hello, ${res.user.name}!`);
    } else {
      bot.reply(message, 'Hello there!');
    }
  });
});

// enable/disable cross origin resource sharing if necessary
app.use(cors());

app.set('view engine', 'ejs');
app.use(express.static('static'));
// enables static assets from folder static
app.set('views', path.join(__dirname, '../app/views'));
// this just allows us to render ejs from the ../app/views directory

// enable json message body for posting data to API
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// default index route
app.get('/', (req, res) => {
  res.send('hi');
});

// START THE SERVER
// =============================================================================
const port = process.env.PORT || 9090;
app.listen(port);

console.log(`listening on: ${port}`);
