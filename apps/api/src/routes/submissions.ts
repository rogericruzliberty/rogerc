/**
 * Liberty Field App — Submissions API Routes
 *
 * CRUD operations for submissions + bulk answer sync.
 * All routes require JWT authentication.
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
const prisma = new PrismaClient();

// ─── Validation Schemas ─────────────────────

const createSubmissionSchema = z.object({
  id: z.string().uuid().optional(), // Client-generated UUID for idempotency
  siteName: z.string().optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  startedAt: z.string().datetime().optional(),
});

const updateSubmissionSchema = z.object({
  status: z.enum(['DRAFT', 'COMPLETED']).optional(),
  siteName: z.string().optional(),
  completedAt: z.string().datetime().optional(),
});

const bulkAnswersSchema = z.object({
  answers: z.array(
    z.object({
      questionKey: z.string(),
      value: z.string().nullable(),
      isNa: z.boolean().default(false),
      updatedAt: z.string().datetime().optional(),
    }),
  ),
});

// ─── Routes ─────────────────────────────────

/**
 * GET /api/projects/:projectId/submissions
 * List all submissions for a project (filtered by user role)
 */
router.get(
  '/api/projects/:projectId/submissions',
  authenticate,
  async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const user = (req as any).user;

    const where: any = { projectId };

    // Field users can only see their own submissions
    if (user.role === 'FIELD') {
      where.userId = user.id;
    }

    const submissions = await prisma.submission.findMany({
      where,
      include: {
        _count: {
          select: {
            answers: true,
            contacts: true,
            attachments: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    res.json({ data: submissions });
  },
);

/**
 * POST /api/projects/:projectId/submissions
 * Create a new submission (idempotent with client-generated ID)
 */
router.post(
  '/api/projects/:projectId/submissions',
  authenticate,
  validate(createSubmissionSchema),
  async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const user = (req as any).user;
    const body = req.body;

    // Idempotent: if client sent an ID that already exists, return it
    if (body.id) {
      const existing = await prisma.submission.findUnique({
        where: { id: body.id },
      });
      if (existing) {
        return res.json({ data: existing });
      }
    }

    const submission = await prisma.submission.create({
      data: {
        id: body.id || undefined, // Use client UUID or let Prisma generate
        projectId,
        userId: user.id,
        siteName: body.siteName,
        locationLat: body.locationLat,
        locationLng: body.locationLng,
        startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
      },
    });

    res.status(201).json({ data: submission });
  },
);

/**
 * GET /api/submissions/:id
 * Get full submission with all answers, contacts, and attachments
 */
router.get(
  '/api/submissions/:id',
  authenticate,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = (req as any).user;

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        answers: true,
        contacts: true,
        attachments: {
          where: { uploadStatus: 'SYNCED' },
        },
        project: {
          select: { id: true, name: true, address: true },
        },
      },
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Field users can only access their own
    if (user.role === 'FIELD' && submission.userId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ data: submission });
  },
);

/**
 * PATCH /api/submissions/:id
 * Update submission status
 */
router.patch(
  '/api/submissions/:id',
  authenticate,
  validate(updateSubmissionSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = (req as any).user;
    const body = req.body;

    // Verify ownership
    const existing = await prisma.submission.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    if (user.role === 'FIELD' && existing.userId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await prisma.submission.update({
      where: { id },
      data: {
        status: body.status,
        siteName: body.siteName,
        completedAt: body.completedAt ? new Date(body.completedAt) : undefined,
        syncedAt: new Date(),
      },
    });

    res.json({ data: updated });
  },
);

/**
 * POST /api/submissions/:id/answers/bulk
 * Upsert multiple answers at once (idempotent on submission_id + question_key)
 */
router.post(
  '/api/submissions/:id/answers/bulk',
  authenticate,
  validate(bulkAnswersSchema),
  async (req: Request, res: Response) => {
    const { id: submissionId } = req.params;
    const user = (req as any).user;
    const { answers } = req.body;

    // Verify ownership
    const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    if (user.role === 'FIELD' && submission.userId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Upsert each answer
    const results = await prisma.$transaction(
      answers.map((answer: any) =>
        prisma.answer.upsert({
          where: {
            submissionId_questionKey: {
              submissionId,
              questionKey: answer.questionKey,
            },
          },
          create: {
            submissionId,
            questionKey: answer.questionKey,
            value: answer.value,
            isNa: answer.isNa,
          },
          update: {
            value: answer.value,
            isNa: answer.isNa,
          },
        }),
      ),
    );

    res.json({ data: results, count: results.length });
  },
);

export { router as submissionsRouter };
