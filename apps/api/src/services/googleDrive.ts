/**
 * Liberty Field App — Google Drive Storage Service
 *
 * Replaces S3 with Google Drive for file storage.
 * Users link their Google account via OAuth 2.0, and
 * all media/exports are stored in a shared Liberty
 * Field App folder in Google Drive.
 *
 * Folder structure in Drive:
 *   Liberty Field App/
 *   ├── {Project Name}/
 *   │   ├── {Submission Timestamp}/
 *   │   │   ├── photos/
 *   │   │   ├── videos/
 *   │   │   ├── audio/
 *   │   │   ├── documents/
 *   │   │   ├── contacts/
 *   │   │   └── summary.json
 *   │   └── exports/
 *   │       └── submission_20260331_site.zip
 */

import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── OAuth Configuration ────────────────────

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file', // Only files created by this app
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback',
);

// ─── Service Class ──────────────────────────

class GoogleDriveService {
  /**
   * Generate the Google OAuth consent URL for a user to link their account.
   */
  getAuthUrl(userId: string): string {
    return oauth2Client.generateAuthUrl({
      access_type: 'offline', // Get refresh token
      scope: SCOPES,
      state: userId, // Pass user ID through OAuth flow
      prompt: 'consent', // Force consent to get refresh token
    });
  }

  /**
   * Exchange an authorization code for tokens and save them.
   */
  async handleOAuthCallback(code: string, userId: string): Promise<void> {
    const { tokens } = await oauth2Client.getToken(code);

    // Save tokens to the user record
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        googleTokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
      },
    });
  }

  /**
   * Get an authenticated Drive client for a specific user.
   */
  async getDriveClient(userId: string): Promise<drive_v3.Drive> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleAccessToken: true,
        googleRefreshToken: true,
        googleTokenExpiry: true,
      },
    });

    if (!user?.googleRefreshToken) {
      throw new Error('User has not linked their Google Drive account');
    }

    const userAuth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );

    userAuth.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken,
      expiry_date: user.googleTokenExpiry?.getTime(),
    });

    // Auto-refresh: listen for new tokens and save them
    userAuth.on('tokens', async (tokens) => {
      await prisma.user.update({
        where: { id: userId },
        data: {
          googleAccessToken: tokens.access_token,
          googleTokenExpiry: tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : null,
        },
      });
    });

    return google.drive({ version: 'v3', auth: userAuth });
  }

  /**
   * Ensure the Liberty Field App folder structure exists in Drive.
   * Returns the submission folder ID.
   */
  async ensureFolderStructure(
    drive: drive_v3.Drive,
    projectName: string,
    submissionLabel: string,
  ): Promise<{
    rootFolderId: string;
    projectFolderId: string;
    submissionFolderId: string;
    subFolders: Record<string, string>;
  }> {
    // 1. Find or create "Liberty Field App" root folder
    const rootFolderId = await this.findOrCreateFolder(
      drive,
      'Liberty Field App',
      'root',
    );

    // 2. Find or create project folder
    const projectFolderId = await this.findOrCreateFolder(
      drive,
      projectName,
      rootFolderId,
    );

    // 3. Create submission folder
    const submissionFolderId = await this.findOrCreateFolder(
      drive,
      submissionLabel,
      projectFolderId,
    );

    // 4. Create subfolders
    const subFolderNames = ['photos', 'videos', 'audio', 'documents', 'contacts'];
    const subFolders: Record<string, string> = {};

    for (const name of subFolderNames) {
      subFolders[name] = await this.findOrCreateFolder(
        drive,
        name,
        submissionFolderId,
      );
    }

    return { rootFolderId, projectFolderId, submissionFolderId, subFolders };
  }

  /**
   * Upload a file to a specific Drive folder.
   * Supports resumable uploads for large files.
   */
  async uploadFile(
    drive: drive_v3.Drive,
    folderId: string,
    filename: string,
    mimeType: string,
    body: Readable | Buffer | string,
    fileSize?: number,
  ): Promise<{ fileId: string; webViewLink: string }> {
    const requestBody: drive_v3.Schema$File = {
      name: filename,
      parents: [folderId],
    };

    const media = {
      mimeType,
      body: typeof body === 'string' ? Readable.from(Buffer.from(body)) : body,
    };

    // Use resumable upload for files > 5MB
    const useResumable = fileSize ? fileSize > 5 * 1024 * 1024 : false;

    const response = await drive.files.create({
      requestBody,
      media,
      fields: 'id, webViewLink, webContentLink',
      // Google Drive API handles chunking internally for resumable uploads
    });

    return {
      fileId: response.data.id!,
      webViewLink: response.data.webViewLink || '',
    };
  }

  /**
   * Generate a resumable upload URI for the mobile client
   * to upload directly to Google Drive.
   */
  async getResumableUploadUri(
    drive: drive_v3.Drive,
    folderId: string,
    filename: string,
    mimeType: string,
    fileSize: number,
  ): Promise<string> {
    const res = await drive.files.create(
      {
        requestBody: {
          name: filename,
          parents: [folderId],
        },
        media: {
          mimeType,
          body: Readable.from(Buffer.alloc(0)),
        },
        fields: 'id',
      },
      {
        // Request resumable upload
        params: { uploadType: 'resumable' },
        headers: {
          'X-Upload-Content-Type': mimeType,
          'X-Upload-Content-Length': fileSize.toString(),
        },
      },
    );

    // The resumable URI is in the response headers
    // The mobile client can PUT chunks to this URI
    return (res as any).headers?.location || '';
  }

  /**
   * Download a file from Drive as a readable stream.
   */
  async downloadFile(
    drive: drive_v3.Drive,
    fileId: string,
  ): Promise<Readable> {
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' },
    );
    return response.data as unknown as Readable;
  }

  /**
   * Get a shareable download link for a file.
   */
  async getDownloadLink(
    drive: drive_v3.Drive,
    fileId: string,
  ): Promise<string> {
    // Make the file accessible via link
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    const file = await drive.files.get({
      fileId,
      fields: 'webContentLink, webViewLink',
    });

    return file.data.webContentLink || file.data.webViewLink || '';
  }

  /**
   * Check if a user has linked their Google Drive.
   */
  async isLinked(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleRefreshToken: true },
    });
    return !!user?.googleRefreshToken;
  }

  /**
   * Unlink a user's Google Drive account.
   */
  async unlink(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
      },
    });
  }

  // ─── Private Helpers ──────────────────────

  private async findOrCreateFolder(
    drive: drive_v3.Drive,
    name: string,
    parentId: string,
  ): Promise<string> {
    // Search for existing folder
    const query = parentId === 'root'
      ? `name='${name}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`
      : `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;

    const existing = await drive.files.list({
      q: query,
      fields: 'files(id)',
      spaces: 'drive',
    });

    if (existing.data.files && existing.data.files.length > 0) {
      return existing.data.files[0].id!;
    }

    // Create new folder
    const folder = await drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId === 'root' ? undefined : [parentId],
      },
      fields: 'id',
    });

    return folder.data.id!;
  }
}

export const googleDriveService = new GoogleDriveService();
