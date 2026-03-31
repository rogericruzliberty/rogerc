/**
 * Liberty Field App — S3 Storage Service
 *
 * Handles presigned URL generation, multipart upload orchestration,
 * and streaming access to files in the S3 bucket.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable, PassThrough } from 'stream';

// ─── Configuration ──────────────────────────

const BUCKET_NAME = process.env.S3_BUCKET || 'liberty-field-app';
const REGION = process.env.AWS_REGION || 'us-east-1';

const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// ─── Service ────────────────────────────────

class S3Service {
  /**
   * Get a presigned URL for a single-PUT upload.
   */
  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(s3Client, command, { expiresIn });
  }

  /**
   * Get a presigned URL for downloading a file.
   */
  async getPresignedDownloadUrl(
    key: string,
    expiresIn: number = 86400,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    return getSignedUrl(s3Client, command, { expiresIn });
  }

  /**
   * Get a readable stream for a file (used by export worker).
   */
  async getObjectStream(key: string): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    return response.Body as Readable;
  }

  /**
   * Initiate an S3 multipart upload.
   */
  async initiateMultipartUpload(
    key: string,
    contentType: string,
  ): Promise<string> {
    const command = new CreateMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const response = await s3Client.send(command);
    return response.UploadId!;
  }

  /**
   * Get a presigned URL for uploading one part of a multipart upload.
   */
  async getPresignedPartUrl(
    key: string,
    uploadId: string,
    partNumber: number,
    expiresIn: number = 3600,
  ): Promise<string> {
    const command = new UploadPartCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });

    return getSignedUrl(s3Client, command, { expiresIn });
  }

  /**
   * Complete a multipart upload with all part ETags.
   */
  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: Array<{ partNumber: number; etag: string }>,
  ): Promise<void> {
    const command = new CompleteMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map((p) => ({
          PartNumber: p.partNumber,
          ETag: p.etag,
        })),
      },
    });

    await s3Client.send(command);
  }

  /**
   * Upload a stream to S3 (used for ZIP exports).
   * Uses @aws-sdk/lib-storage for managed multipart streaming upload.
   */
  async uploadStream(
    key: string,
    stream: PassThrough,
    contentType: string,
  ): Promise<{ sizeBytes: number }> {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: stream,
        ContentType: contentType,
      },
      queueSize: 4,          // 4 concurrent part uploads
      partSize: 10 * 1024 * 1024, // 10 MB parts
    });

    const result = await upload.done();

    // Get file size from S3 (HEAD request would be more precise,
    // but for scaffolding we return 0 and rely on the archive metadata)
    return { sizeBytes: 0 };
  }
}

export const s3Service = new S3Service();
