import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import path from 'path';

import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/error.js';

const app = express();

const allowedOrigins = (
  process.env.CORS_ORIGIN ||
  'http://localhost:5173,http://127.0.0.1:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
  console.warn('❌ CORS rejected origin:', origin, '| allowed:', allowedOrigins);

    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
  exposedHeaders: ['Content-Length', 'Content-Type', 'Content-Disposition', 'Accept-Ranges'],
};

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: process.env.JSON_LIMIT || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.JSON_LIMIT || '10mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.get('/health', (_req, res) =>
  res.json({
    success: true,
    data: { status: 'ok' },
    message: 'Dialysis API running',
    errors: [],
  })
);

// Static uploads
app.use('/uploads', cors(corsOptions), express.static(path.join(process.cwd(), 'uploads')));

// API routes
app.use('/api/v1', cors(corsOptions), routes);

app.use(notFound);
app.use(errorHandler);

export default app;