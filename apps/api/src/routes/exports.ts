/**
 * Liberty Field App — Export API Routes
 *
 * Queue ZIP generation jobs and serve download links.
 */

import { Router, Request, Response } from 'express';
import { Queue } from 'bullmq';
import { authenticate } from '../middleware/auth';

const router = Router();

const exportQueue = new Queue('export-queue', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

/**
 * POST /api/submissions/:id/export
 * Queue a ZIP export generation job.
 */
router.post(
  '/api/submissions/:id/export',
  authenticate,
  async (req: Request, res: Response) => {
    const { id: submissionId } = req.params;
    const user = (req as any).user;

    const job = await exportQueue.add(
      'generate-zip',
      {
        submissionId,
        requestedBy: user.id,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 86400 }, // keep for 24h
        removeOnFail: { age: 604800 },     // keep failures for 7d
      },
    );

    res.status(202).json({
      data: {
        jobId: job.id,
        status: 'queued',
        message: 'Export is being generated. Check status at /api/exports/:jobId/status',
      },
    });
  },
);

/**
 * GET /api/exports/:jobId/status
 * Check the status of an export job.
 */
router.get(
  '/api/exports/:jobId/status',
  authenticate,
  async (req: Request, res: Response) => {
    const { jobId } = req.params;

    const job = await exportQueue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Export job not found' });
    }

    const state = await job.getState();
    const progress = job.progress;

    res.json({
      data: {
        jobId: job.id,
        status: state,
        progress: typeof progress === 'number' ? progress : 0,
        result: state === 'completed' ? job.returnvalue : null,
        failedReason: state === 'failed' ? job.failedReason : null,
      },
    });
  },
);

/**
 * GET /api/exports/:jobId/download
 * Redirect to the presigned S3 download URL.
 */
router.get(
  '/api/exports/:jobId/download',
  authenticate,
  async (req: Request, res: Response) => {
    const { jobId } = req.params;

    const job = await exportQueue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Export job not found' });
    }

    const state = await job.getState();
    if (state !== 'completed') {
      return res.status(400).json({
        error: 'Export not ready',
        status: state,
      });
    }

    const { downloadUrl } = job.returnvalue;
    res.redirect(downloadUrl);
  },
);

export { router as exportsRouter };
