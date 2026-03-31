/**
 * Liberty Field App — API Server Entry Point
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { authRouter } from './routes/auth';
import { projectsRouter } from './routes/projects';
import { submissionsRouter } from './routes/submissions';
import { attachmentsRouter } from './routes/attachments';
import { exportsRouter } from './routes/exports';

// Import export worker to start processing
import './services/exportWorker';

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// ─── Health Check ───────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ─────────────────────────────────

app.use(authRouter);
app.use(projectsRouter);
app.use(submissionsRouter);
app.use(attachmentsRouter);
app.use(exportsRouter);

// ─── Error Handler ──────────────────────────

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API Error]', err);

  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors,
    });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// ─── Start ──────────────────────────────────

app.listen(PORT, () => {
  console.log(`Liberty Field API running on port ${PORT}`);
});

export { app };
