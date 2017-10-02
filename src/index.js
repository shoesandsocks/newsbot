import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import routes from './routes';

require('dotenv').config();

const port = process.env.PORT || 3000;
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(routes);
app.use(express.static(path.join(__dirname, '../public')));

app.listen(port, () => console.log(`on ${port}`)); // eslint-disable-line
