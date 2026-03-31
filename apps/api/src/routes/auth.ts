/**
 * Liberty Field App — Auth Routes
 *
 * Handles email/password login, JWT refresh, and Google OAuth
 * for linking Google Drive accounts.
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { googleDriveService } from '../services/googleDrive';

const router = Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES = '15m';
const REFRESH_EXPIRES = '30d';

// ─── Validation ─────────────────────────────

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

// ─── Login ──────────────────────────────────

router.post(
  '/api/auth/login',
  validate(loginSchema),
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES },
    );

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: REFRESH_EXPIRES },
    );

    res.json({
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          googleDriveLinked: !!user.googleRefreshToken,
        },
      },
    });
  },
);

// ─── Refresh Token ──────────────────────────

router.post(
  '/api/auth/refresh',
  validate(refreshSchema),
  async (req: Request, res: Response) => {
    try {
      const payload = jwt.verify(req.body.refreshToken, JWT_SECRET) as any;
      if (payload.type !== 'refresh') throw new Error('Invalid token type');

      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user) throw new Error('User not found');

      const accessToken = jwt.sign(
        { userId: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES },
      );

      const refreshToken = jwt.sign(
        { userId: user.id, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: REFRESH_EXPIRES },
      );

      res.json({ accessToken, refreshToken });
    } catch {
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  },
);

// ─── Current User ───────────────────────────

router.get('/api/auth/me', authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user;

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      googleRefreshToken: true,
    },
  });

  res.json({
    data: {
      ...fullUser,
      googleRefreshToken: undefined,
      googleDriveLinked: !!fullUser?.googleRefreshToken,
    },
  });
});

// ─── Google OAuth: Link Drive ───────────────

/**
 * GET /api/auth/google/link
 * Redirects the user to Google's OAuth consent screen
 * to link their Google Drive account.
 */
router.get(
  '/api/auth/google/link',
  authenticate,
  async (req: Request, res: Response) => {
    const user = (req as any).user;
    const authUrl = googleDriveService.getAuthUrl(user.id);
    res.json({ data: { authUrl } });
  },
);

/**
 * GET /api/auth/google/callback
 * Google redirects here after the user grants consent.
 * Exchanges the code for tokens and saves them.
 */
router.get(
  '/api/auth/google/callback',
  async (req: Request, res: Response) => {
    const { code, state: userId } = req.query;

    if (!code || !userId) {
      return res.status(400).json({ error: 'Missing code or state' });
    }

    try {
      await googleDriveService.handleOAuthCallback(
        code as string,
        userId as string,
      );

      // Redirect back to the app with success
      // In production, this redirects to a deep link that the mobile app handles
      res.redirect(
        `${process.env.APP_DEEP_LINK || 'libertyfield://'}google-linked?success=true`,
      );
    } catch (error: any) {
      console.error('[Auth] Google OAuth callback error:', error);
      res.redirect(
        `${process.env.APP_DEEP_LINK || 'libertyfield://'}google-linked?error=${encodeURIComponent(error.message)}`,
      );
    }
  },
);

/**
 * POST /api/auth/google/unlink
 * Remove the user's Google Drive connection.
 */
router.post(
  '/api/auth/google/unlink',
  authenticate,
  async (req: Request, res: Response) => {
    const user = (req as any).user;
    await googleDriveService.unlink(user.id);
    res.json({ data: { message: 'Google Drive unlinked' } });
  },
);

/**
 * GET /api/auth/google/status
 * Check if the user's Google Drive is linked and working.
 */
router.get(
  '/api/auth/google/status',
  authenticate,
  async (req: Request, res: Response) => {
    const user = (req as any).user;
    const linked = await googleDriveService.isLinked(user.id);

    if (linked) {
      try {
        // Test the connection by getting drive info
        const drive = await googleDriveService.getDriveClient(user.id);
        const about = await drive.about.get({ fields: 'user' });
        res.json({
          data: {
            linked: true,
            googleEmail: about.data.user?.emailAddress,
            googleName: about.data.user?.displayName,
          },
        });
      } catch {
        res.json({ data: { linked: false, error: 'Token expired, please re-link' } });
      }
    } else {
      res.json({ data: { linked: false } });
    }
  },
);

export { router as authRouter };
