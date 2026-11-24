// Canvas globals must exist before any pdfjs-importing module is evaluated.
import './services/pdf/nodeCanvasSetup.js';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { config } from './config/index.js';
import { requestId } from './middleware/requestId.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.routes.js';
import sessionRoutes from './routes/session.routes.js';
import documentRoutes from './routes/document.routes.js';
import redactionRoutes from './routes/redaction.routes.js';

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    // The cors package reflects the matching entry from a list. Keep a single
    // entry as a string so the development-only '*' wildcard still works.
    origin: config.clientOrigins.length === 1
      ? config.clientOrigins[0]
      : config.clientOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Session-Token', 'X-Request-Id'],
  }),
);

app.use(requestId);

// Structured access log: no query strings, no IPs, no bodies, no file names.
app.use(
  morgan((tokens, req, res) => {
    const log = {
      time: new Date().toISOString(),
      event: 'HTTP_REQUEST',
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: tokens['response-time'](req, res),
    };
    return JSON.stringify(log);
  }, {
    stream: { write: (line) => process.stdout.write(`${line}\n`) },
  }),
);

app.use(express.json({ limit: config.jsonBodyLimit }));
app.use(express.urlencoded({ extended: false, limit: config.jsonBodyLimit }));

app.use(config.apiPrefix, healthRoutes);
app.use(`${config.apiPrefix}/sessions`, sessionRoutes);
app.use(`${config.apiPrefix}/sessions/:sessionId/documents`, documentRoutes);
app.use(`${config.apiPrefix}/sessions/:sessionId/redactions`, redactionRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
