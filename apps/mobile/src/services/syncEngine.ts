/**
 * Liberty Field App — Sync Engine
 *
 * Offline-first sync queue processor. Runs as a singleton,
 * listens for connectivity changes, and processes the local
 * SQLite sync queue in priority order.
 *
 * Priority: submissions → answers → contacts → attachments
 *
 * File uploads use presigned S3 URLs with chunked multipart
 * for files > 5MB. Each chunk is individually retriable.
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';
import { db } from './database';
import { apiClient } from './apiClient';
import { uploadFile } from './uploadService';

// ─── Types ──────────────────────────────────

export type SyncEntityType = 'submission' | 'answer' | 'contact' | 'attachment';
export type SyncAction = 'create' | 'update' | 'upload';
export type SyncStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface SyncQueueItem {
  id: string;
  entityType: SyncEntityType;
  entityId: string;
  action: SyncAction;
  payload: string; // JSON serialized
  status: SyncStatus;
  retryCount: number;
  errorMsg: string | null;
  createdAt: string;
  processedAt: string | null;
}

// ─── Constants ──────────────────────────────

const MAX_RETRIES = 10;
const MAX_CONCURRENT_UPLOADS = 2;
const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 300_000; // 5 minutes

/** Processing priority: lower = higher priority */
const ENTITY_PRIORITY: Record<SyncEntityType, number> = {
  submission: 0,
  answer: 1,
  contact: 2,
  attachment: 3,
};

// ─── Sync Engine ────────────────────────────

class SyncEngine {
  private isRunning = false;
  private isOnline = false;
  private wifiOnly = false;
  private unsubscribeNetInfo: (() => void) | null = null;
  private listeners = new Set<(stats: SyncStats) => void>();

  /** Start listening for connectivity and begin processing */
  start(options?: { wifiOnly?: boolean }) {
    if (this.unsubscribeNetInfo) return; // already started

    this.wifiOnly = options?.wifiOnly ?? false;

    this.unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
      const wasOnline = this.isOnline;
      this.isOnline = !!state.isConnected && !!state.isInternetReachable;

      // If wifiOnly, only proceed on WiFi
      if (this.wifiOnly && state.type !== 'wifi') {
        this.isOnline = false;
      }

      // Trigger processing when coming online
      if (!wasOnline && this.isOnline) {
        console.log('[SyncEngine] Connectivity restored, processing queue...');
        this.processQueue();
      }
    });

    // Check initial state
    NetInfo.fetch().then((state) => {
      this.isOnline = !!state.isConnected && !!state.isInternetReachable;
      if (this.wifiOnly && state.type !== 'wifi') {
        this.isOnline = false;
      }
      if (this.isOnline) this.processQueue();
    });
  }

  /** Stop the sync engine */
  stop() {
    this.unsubscribeNetInfo?.();
    this.unsubscribeNetInfo = null;
  }

  /** Enqueue a new item for sync */
  async enqueue(
    entityType: SyncEntityType,
    entityId: string,
    action: SyncAction,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const id = generateUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO sync_queue (id, entity_type, entity_id, action, payload, status, retry_count, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', 0, ?)`,
      [id, entityType, entityId, action, JSON.stringify(payload), now],
    );

    this.notifyListeners();

    // If we're online, process immediately
    if (this.isOnline && !this.isRunning) {
      this.processQueue();
    }
  }

  /** Get current sync statistics */
  async getStats(): Promise<SyncStats> {
    const rows = await db.getAllAsync<{ status: string; count: number }>(
      `SELECT status, COUNT(*) as count FROM sync_queue GROUP BY status`,
    );

    const stats: SyncStats = { pending: 0, processing: 0, completed: 0, failed: 0, total: 0 };
    for (const row of rows) {
      stats[row.status as keyof SyncStats] = row.count;
      stats.total += row.count;
    }
    return stats;
  }

  /** Subscribe to sync status changes */
  subscribe(listener: (stats: SyncStats) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Manually retry all failed items */
  async retryAllFailed(): Promise<void> {
    await db.runAsync(
      `UPDATE sync_queue SET status = 'pending', retry_count = 0, error_msg = NULL
       WHERE status = 'failed'`,
    );
    this.notifyListeners();
    if (this.isOnline) this.processQueue();
  }

  /** Manually retry a single failed item */
  async retryItem(id: string): Promise<void> {
    await db.runAsync(
      `UPDATE sync_queue SET status = 'pending', retry_count = 0, error_msg = NULL
       WHERE id = ?`,
      [id],
    );
    this.notifyListeners();
    if (this.isOnline) this.processQueue();
  }

  // ─── Private Methods ──────────────────────

  private async processQueue(): Promise<void> {
    if (this.isRunning || !this.isOnline) return;
    this.isRunning = true;

    try {
      while (this.isOnline) {
        // Fetch next batch of pending items, ordered by priority
        const items = await db.getAllAsync<SyncQueueItem>(
          `SELECT * FROM sync_queue
           WHERE status = 'pending'
           ORDER BY
             CASE entity_type
               WHEN 'submission' THEN 0
               WHEN 'answer' THEN 1
               WHEN 'contact' THEN 2
               WHEN 'attachment' THEN 3
             END,
             created_at ASC
           LIMIT 10`,
        );

        if (items.length === 0) break;

        // Process non-attachment items sequentially
        // Process attachment items with concurrency
        const nonAttachments = items.filter((i) => i.entityType !== 'attachment');
        const attachments = items.filter((i) => i.entityType === 'attachment');

        // Sequential processing for data items
        for (const item of nonAttachments) {
          if (!this.isOnline) break;
          await this.processItem(item);
        }

        // Concurrent processing for file uploads (limited)
        if (attachments.length > 0 && this.isOnline) {
          const chunks = chunkArray(attachments, MAX_CONCURRENT_UPLOADS);
          for (const chunk of chunks) {
            if (!this.isOnline) break;
            await Promise.all(chunk.map((item) => this.processItem(item)));
          }
        }
      }
    } catch (error) {
      console.error('[SyncEngine] Queue processing error:', error);
    } finally {
      this.isRunning = false;
      this.notifyListeners();
    }
  }

  private async processItem(item: SyncQueueItem): Promise<void> {
    // Mark as processing
    await db.runAsync(
      `UPDATE sync_queue SET status = 'processing' WHERE id = ?`,
      [item.id],
    );
    this.notifyListeners();

    try {
      const payload = JSON.parse(item.payload);

      switch (item.entityType) {
        case 'submission':
          await this.syncSubmission(item, payload);
          break;
        case 'answer':
          await this.syncAnswers(item, payload);
          break;
        case 'contact':
          await this.syncContact(item, payload);
          break;
        case 'attachment':
          await this.syncAttachment(item, payload);
          break;
      }

      // Mark completed
      await db.runAsync(
        `UPDATE sync_queue SET status = 'completed', processed_at = ? WHERE id = ?`,
        [new Date().toISOString(), item.id],
      );
    } catch (error: any) {
      const isNetworkError = isTransientError(error);
      const newRetryCount = item.retryCount + (isNetworkError ? 0 : 1);

      if (newRetryCount >= MAX_RETRIES) {
        // Permanently failed
        await db.runAsync(
          `UPDATE sync_queue SET status = 'failed', retry_count = ?, error_msg = ? WHERE id = ?`,
          [newRetryCount, error.message || 'Unknown error', item.id],
        );
      } else {
        // Retry with backoff
        const backoff = Math.min(
          BACKOFF_BASE_MS * Math.pow(2, newRetryCount),
          BACKOFF_MAX_MS,
        );
        await db.runAsync(
          `UPDATE sync_queue SET status = 'pending', retry_count = ?, error_msg = ? WHERE id = ?`,
          [newRetryCount, error.message || 'Unknown error', item.id],
        );

        // Schedule retry after backoff
        setTimeout(() => {
          if (this.isOnline && !this.isRunning) this.processQueue();
        }, backoff);
      }
    }

    this.notifyListeners();
  }

  private async syncSubmission(
    item: SyncQueueItem,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (item.action === 'create') {
      await apiClient.post(
        `/api/projects/${payload.projectId}/submissions`,
        {
          id: item.entityId,
          siteName: payload.siteName,
          locationLat: payload.locationLat,
          locationLng: payload.locationLng,
          startedAt: payload.startedAt,
        },
      );
    } else if (item.action === 'update') {
      await apiClient.patch(`/api/submissions/${item.entityId}`, payload);
    }
  }

  private async syncAnswers(
    item: SyncQueueItem,
    payload: Record<string, unknown>,
  ): Promise<void> {
    // Bulk upsert answers for a submission
    await apiClient.post(
      `/api/submissions/${payload.submissionId}/answers/bulk`,
      { answers: payload.answers },
    );
  }

  private async syncContact(
    item: SyncQueueItem,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (item.action === 'create') {
      await apiClient.post(
        `/api/submissions/${payload.submissionId}/contacts`,
        { id: item.entityId, ...payload },
      );
    } else if (item.action === 'update') {
      await apiClient.patch(`/api/contacts/${item.entityId}`, payload);
    }
  }

  private async syncAttachment(
    item: SyncQueueItem,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const localUri = payload.localUri as string;
    const submissionId = payload.submissionId as string;
    const filename = payload.filename as string;
    const mimeType = payload.mimeType as string;
    const sizeBytes = payload.sizeBytes as number;

    // 1. Request presigned URL from API
    const { data } = await apiClient.post(
      `/api/submissions/${submissionId}/attachments/presign`,
      {
        id: item.entityId,
        filename,
        mimeType,
        sizeBytes,
        type: payload.type,
      },
    );

    // 2. Upload file to S3 (single or multipart based on size)
    await uploadFile({
      localUri,
      uploadUrl: data.uploadUrl,
      uploadId: data.uploadId,
      attachmentId: item.entityId,
      sizeBytes,
      mimeType,
    });

    // 3. Confirm upload completion
    await apiClient.post(`/api/attachments/${item.entityId}/complete`);

    // 4. Optionally clean up local file (keep a reference)
    // await FileSystem.deleteAsync(localUri, { idempotent: true });
  }

  private async notifyListeners(): Promise<void> {
    const stats = await this.getStats();
    this.listeners.forEach((listener) => listener(stats));
  }
}

// ─── Helpers ────────────────────────────────

export interface SyncStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isTransientError(error: any): boolean {
  if (!error) return false;
  // Network errors (no connection, timeout)
  if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') return true;
  // Server errors (5xx) are transient
  if (error.response?.status >= 500) return true;
  return false;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ─── Singleton Export ───────────────────────

export const syncEngine = new SyncEngine();
