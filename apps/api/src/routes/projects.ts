/**
 * Liberty Field App — Projects API Routes
 *
 * CRUD operations for projects. Admins can create/update,
 * field users can list projects they're assigned to.
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
const prisma = new PrismaClient();

// ─── Validation Schemas ─────────────────────

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  address: z.string().optional(),
  suiteNumber: z.string().optional(),
  clientName: z.string().optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  suiteNumber: z.string().optional(),
  clientName: z.string().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
});

// ─── Routes ─────────────────────────────────

/**
 * GET /api/projects
 * List all active projects. Admin sees all; field users see all active.
 */
router.get(
  '/api/projects',
  authenticate,
  async (req: Request, res: Response) => {
    const user = (req as any).user;
    const status = req.query.status as string | undefined;

    const where: any = {};
    if (status) {
      where.status = status;
    } else {
      where.status = 'ACTIVE';
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        _count: {
          select: { submissions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: projects });
  },
);

/**
 * GET /api/projects/:id
 * Get single project with submission count.
 */
router.get(
  '/api/projects/:id',
  authenticate,
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: { submissions: true },
        },
        submissions: {
          orderBy: { startedAt: 'desc' },
          take: 10,
          select: {
            id: true,
            status: true,
            siteName: true,
            startedAt: true,
            completedAt: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ data: project });
  },
);

/**
 * POST /api/projects
 * Create a new project. Admin only.
 */
router.post(
  '/api/projects',
  authenticate,
  requireRole('ADMIN'),
  validate(createProjectSchema),
  async (req: Request, res: Response) => {
    const user = (req as any).user;
    const body = req.body;

    const project = await prisma.project.create({
      data: {
        name: body.name,
        address: body.address,
        suiteNumber: body.suiteNumber,
        clientName: body.clientName,
        createdBy: user.id,
      },
    });

    res.status(201).json({ data: project });
  },
);

/**
 * PATCH /api/projects/:id
 * Update a project. Admin only.
 */
router.patch(
  '/api/projects/:id',
  authenticate,
  requireRole('ADMIN'),
  validate(updateProjectSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const body = req.body;

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: body,
    });

    res.json({ data: updated });
  },
);

export { router as projectsRouter };
