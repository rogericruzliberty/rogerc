/**
 * Liberty Field App — Export Worker (Google Drive)
 *
 * BullMQ worker that generates ZIP archives from submissions
 * and uploads them to the user's Google Drive.
 */

import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import archiver from 'archiver';
import { PassThrough, Readable } from 'stream';
import { googleDriveService } from './googleDrive';
import { generateVCard, contactsToCsv } from './vcardGenerator';

const prisma = new PrismaClient();

// ─── Types ──────────────────────────────────

interface ExportJobData {
  submissionId: string;
  requestedBy: string;
}

interface ExportJobResult {
  driveFileId: string;
  downloadLink: string;
  folderName: string;
}

// ─── Worker ─────────────────────────────────

export const exportWorker = new Worker<ExportJobData, ExportJobResult>(
  'export-queue',
  async (job: Job<ExportJobData>) => {
    const { submissionId, requestedBy } = job.data;

    console.log(`[Export] Starting export for submission ${submissionId}`);

    // 1. Fetch full submission data
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        answers: true,
        contacts: true,
        attachments: {
          where: { uploadStatus: 'SYNCED' },
        },
        project: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!submission) {
      throw new Error(`Submission ${submissionId} not found`);
    }

    // 2. Get the requesting user's Drive client
    const drive = await googleDriveService.getDriveClient(requestedBy);

    // 3. Build folder name
    const timestamp = (submission.completedAt || submission.startedAt)
      .toISOString()
      .replace(/[:.T]/g, '')
      .slice(0, 14);
    const siteSafe = (submission.siteName || 'site')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .slice(0, 30);
    const folderName = `submission_${timestamp}_${siteSafe}`;

    // 4. Create ZIP archive (streaming to buffer)
    const archive = archiver('zip', { zlib: { level: 6 } });
    const chunks: Buffer[] = [];
    const passThrough = new PassThrough();

    passThrough.on('data', (chunk) => chunks.push(chunk));
    archive.pipe(passThrough);

    let processedFiles = 0;
    const totalFiles = submission.attachments.length;

    // 5. Add media files by type
    const typeToFolder: Record<string, string> = {
      PHOTO: 'photos',
      VIDEO: 'videos',
      AUDIO: 'audio',
      DOCUMENT: 'documents',
    };

    for (const attachment of submission.attachments) {
      const folder = typeToFolder[attachment.type] || 'other';
      const filePath = `${folderName}/${folder}/${attachment.filename}`;

      try {
        if (attachment.driveFileId) {
          // Download from Google Drive and add to archive
          const stream = await googleDriveService.downloadFile(
            drive,
            attachment.driveFileId,
          );
          archive.append(stream, { name: filePath });
        }
        processedFiles++;
        await job.updateProgress(Math.round((processedFiles / totalFiles) * 70));
      } catch (error) {
        console.warn(`[Export] Failed to fetch ${attachment.filename}:`, error);
        archive.append(
          `File not available: ${attachment.filename}\nError: ${(error as Error).message}`,
          { name: `${filePath}.missing.txt` },
        );
      }
    }

    // 6. Generate summary.json
    const answersMap: Record<string, { value: string | null; is_na: boolean }> = {};
    for (const answer of submission.answers) {
      answersMap[answer.questionKey] = {
        value: answer.value,
        is_na: answer.isNa,
      };
    }

    const summary = {
      submission_id: submission.id,
      project: {
        name: submission.project.name,
        address: submission.project.address,
        suite_number: submission.project.suiteNumber,
      },
      submitted_by: {
        name: submission.user.name,
        email: submission.user.email,
      },
      started_at: submission.startedAt.toISOString(),
      completed_at: submission.completedAt?.toISOString() || null,
      location: submission.locationLat
        ? { lat: submission.locationLat, lng: submission.locationLng }
        : null,
      answers: answersMap,
      contacts: submission.contacts.map((c: any) => ({
        name: c.name, title: c.title, phone: c.phone,
        email: c.email, company: c.company, role_type: c.roleType,
      })),
      attachments: {
        photos: submission.attachments.filter((a: any) => a.type === 'PHOTO').map((a: any) => a.filename),
        videos: submission.attachments.filter((a: any) => a.type === 'VIDEO').map((a: any) => a.filename),
        audio: submission.attachments.filter((a: any) => a.type === 'AUDIO').map((a: any) => a.filename),
        documents: submission.attachments.filter((a: any) => a.type === 'DOCUMENT').map((a: any) => a.filename),
      },
    };

    archive.append(JSON.stringify(summary, null, 2), {
      name: `${folderName}/summary.json`,
    });

    // 7. Generate contact files
    if (submission.contacts.length > 0) {
      archive.append(
        JSON.stringify(submission.contacts.map((c: any) => ({
          name: c.name, title: c.title, phone: c.phone,
          email: c.email, company: c.company, role: c.roleType,
        })), null, 2),
        { name: `${folderName}/contacts/contacts.json` },
      );

      archive.append(contactsToCsv(submission.contacts), {
        name: `${folderName}/contacts/contacts.csv`,
      });

      for (const contact of submission.contacts) {
        const vcard = generateVCard(contact);
        const vcfName = contact.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        archive.append(vcard, { name: `${folderName}/contacts/${vcfName}.vcf` });
      }
    }

    await job.updateProgress(80);

    // 8. Finalize archive
    await archive.finalize();

    // Wait for all data to be collected
    await new Promise<void>((resolve) => passThrough.on('end', resolve));
    const zipBuffer = Buffer.concat(chunks);

    await job.updateProgress(90);

    // 9. Upload ZIP to Google Drive (in the project's exports folder)
    const folders = await googleDriveService.ensureFolderStructure(
      drive,
      submission.project.name,
      'exports',
    );

    const { fileId, webViewLink } = await googleDriveService.uploadFile(
      drive,
      folders.submissionFolderId,
      `${folderName}.zip`,
      'application/zip',
      Readable.from(zipBuffer),
      zipBuffer.length,
    );

    // Get a shareable download link
    const downloadLink = await googleDriveService.getDownloadLink(drive, fileId);

    await job.updateProgress(100);

    console.log(`[Export] Completed: ${folderName}.zip → Drive file ${fileId}`);

    return { driveFileId: fileId, downloadLink, folderName };
  },
  {
    connection: process.env.REDIS_URL
            ? (() => { const u = new URL(process.env.REDIS_URL); return { host: u.hostname, port: parseInt(u.port || '6379'), password: u.password || undefined }; })()
            : { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379') },
    concurrency: 2,
  },
);

exportWorker.on('completed', (job) => {
  console.log(`[Export] Job ${job.id} completed`);
});

exportWorker.on('failed', (job, err) => {
  console.error(`[Export] Job ${job?.id} failed:`, err);
});
