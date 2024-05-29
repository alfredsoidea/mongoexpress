import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import multer from 'multer';
import request from 'request';
import axios from 'axios';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import ejs from 'ejs';
const app = express();

app.use(morgan('dev'));
app.use(helmet());
app.use(cors());
app.use(express.json());

// app.set('view engine', 'html');
// app.engine('html', ejs.renderFile);

import { lineApi } from './routes/lineApi.js';
import { larkApi } from './routes/larkApi.js';
import { lineCommand } from './routes/lineCommand.js';
import { chatGpt } from './routes/chatGpt.js';

lineApi(app);

larkApi(app);

lineCommand(app);

chatGpt(app);

const port = process.env.PORT || 8000;

app.listen(port, () => {
  console.log(`Listening: http://localhost:${port}`);
});

export default  app;
