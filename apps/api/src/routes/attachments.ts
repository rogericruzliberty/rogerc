/**
 * Liberty Field App — Attachments API Routes (Google Drive)
 *
 * Handles file uploads to Google Drive via the user's linked account.
 * Supports resumable uploads for large files.
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { googleDriveService } from '../services/googleDrive';

const router = Router();
const prisma = new PrismaClient();

// ─── Validation ─────────────────────────────

const initUploadSchema = z.object({
  id: z.string().uuid().optional(),
  filename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  type: z.enum(['PHOTO', 'VIDEO', 'AUDIO', 'DOCUMENT']),
});

// ─── Routes ─────────────────────────────────

/**
 * POST /api/submissions/:id/attachments/init-upload
 * Initialize a file upload to Google Drive.
 * Returns a resumable upload URI for the mobile client to upload directly.
 */
router.post(
  '/api/submissions/:id/attachments/init-upload',
  authenticate,
  validate(initUploadSchema),
  async (req: Request, res: Response) => {
    const { id: submissionId } = req.params;
    const user = (req as any).user;
    const { id: clientId, filename, mimeType, sizeBytes, type } = req.body;

    // Check Google Drive is linked
    const isLinked = await googleDriveService.isLinked(user.id);
    if (!isLinked) {
      return res.status(400).json({
        error: 'Google Drive not linked',
        message: 'Please link your Google Drive account in Settings before uploading.',
      });
    }

    // Get submission with project info for folder structure
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { project: true },
    });
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Idempotent check
    if (clientId) {
      const existing = await prisma.fileAttachment.findUnique({ where: { id: clientId } });
      if (existing && existing.uploadStatus === 'SYNCED') {
        return res.json({
          data: { attachmentId: existing.id, status: 'already_synced' },
        });
      }
    }

    try {
      // Get authenticated Drive client for this user
      const drive = await googleDriveService.getDriveClient(user.id);

      // Ensure folder structure exists
      const timestamp = (submission.startedAt).toISOString().slice(0, 10);
      const submissionLabel = `${timestamp}_${submission.siteName || 'survey'}`;
      const folders = await googleDriveService.ensureFolderStructure(
        drive,
        submission.project.name,
        submissionLabel,
      );

      // Determine which subfolder to upload to
      const typeToFolder: Record<string, string> = {
        PHOTO: 'photos',
        VIDEO: 'videos',
        AUDIO: 'audio',
        DOCUMENT: 'documents',
      };
      const targetFolderId = folders.subFolders[typeToFolder[type]] || folders.submissionFolderId;

      // For large files (> 5MB), get a resumable upload URI
      // For smaller files, return the folder ID and let the client do a simple upload
      let uploadUri = '';
      if (sizeBytes > 5 * 1024 * 1024) {
        uploadUri = await googleDriveService.getResumableUploadUri(
          drive,
          targetFolderId,
          filename,
          mimeType,
          sizeBytes,
        );
      }

      // Create or update attachment record
      const attachment = await prisma.fileAttachment.upsert({
        where: { id: clientId || 'new' },
        create: {
          id: clientId || undefined,
          submissionId,
          type,
          filename,
          mimeType,
          sizeBytes: BigInt(sizeBytes),
          driveFolderId: targetFolderId,
          uploadStatus: 'UPLOADING',
        },
        update: {
          uploadStatus: 'UPLOADING',
          driveFolderId: targetFolderId,
        },
      });

      res.status(201).json({
        data: {
          attachmentId: attachment.id,
          folderId: targetFolderId,
          resumableUploadUri: uploadUri || null,
          useResumable: sizeBytes > 5 * 1024 * 1024,
        },
      });
    } catch (error: any) {
      console.error('[Attachments] Upload init error:', error);
      res.status(500).json({ error: 'Failed to initialize upload', details: error.message });
    }
  },
);

/**
 * POST /api/attachments/:id/complete
 * Called after the mobile client finishes uploading to Google Drive.
 * Saves the Drive file ID and marks as synced.
 */
router.post(
  '/api/attachments/:id/complete',
  authenticate,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { driveFileId } = req.body;

    if (!driveFileId) {
      return res.status(400).json({ error: 'driveFileId is required' });
    }

    const user = (req as any).user;

    try {
      // Verify the file exists in Drive
      const drive = await googleDriveService.getDriveClient(user.id);
      const file = await drive.files.get({
        fileId: driveFileId,
        fields: 'id, name, webViewLink, size',
      });

      const attachment = await prisma.fileAttachment.update({
        where: { id },
        data: {
          uploadStatus: 'SYNCED',
          driveFileId,
          remoteUrl: file.data.webViewLink || '',
        },
      });

      res.json({ data: attachment });
    } catch (error: any) {
      console.error('[Attachments] Complete error:', error);
      res.status(500).json({ error: 'Failed to verify upload', details: error.message });
    }
  },
);

/**
 * GET /api/attachments/:id/download
 * Get a download link for an attachment.
 */
router.get(
  '/api/attachments/:id/download',
  authenticate,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = (req as any).user;

    const attachment = await prisma.fileAttachment.findUnique({ where: { id } });
    if (!attachment || !attachment.driveFileId) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    try {
      const drive = await googleDriveService.getDriveClient(user.id);
      const downloadLink = await googleDriveService.getDownloadLink(
        drive,
        attachment.driveFileId,
      );
      res.json({ data: { downloadLink } });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get download link' });
    }
  },
);

export { router as attachmentsRouter };
