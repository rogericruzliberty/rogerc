/**
 * Liberty Field App — Shared TypeScript Types
 */

// ─── API Response Types ─────────────────────

export interface ApiResponse<T> {
  data: T;
  count?: number;
}

export interface ApiError {
  error: string;
  details?: Array<{ field: string; message: string }>;
}

// ─── Domain Models ──────────────────────────

export interface Project {
  id: string;
  name: string;
  address: string | null;
  suiteNumber: string | null;
  clientName: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  _count?: {
    submissions: number;
  };
}

export interface Submission {
  id: string;
  projectId: string;
  userId: string;
  status: 'DRAFT' | 'COMPLETED' | 'SYNCED';
  siteName: string | null;
  locationLat: number | null;
  locationLng: number | null;
  startedAt: string;
  completedAt: string | null;
  syncedAt: string | null;
  _count?: {
    answers: number;
    contacts: number;
    attachments: number;
  };
}

export interface Answer {
  id: string;
  submissionId: string;
  questionKey: string;
  value: string | null;
  isNa: boolean;
  updatedAt: string;
}

export interface Contact {
  id: string;
  submissionId: string;
  name: string;
  title: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  roleType: ContactRoleType;
  notes: string | null;
}

export type ContactRoleType =
  | 'BUILDING_MANAGER'
  | 'FIRE_ALARM_CONTRACTOR'
  | 'SPRINKLER_CONTRACTOR'
  | 'EMS_VENDOR'
  | 'OTHER';

export interface FileAttachment {
  id: string;
  submissionId: string;
  type: 'PHOTO' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  filename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  driveFileId: string | null;
  remoteUrl: string | null;
  uploadStatus: 'PENDING' | 'UPLOADING' | 'SYNCED' | 'FAILED';
  localUri?: string;
}

// ─── Sync Types ─────────────────────────────

export interface SyncQueueItem {
  id: string;
  type: 'submission' | 'answer' | 'contact' | 'attachment';
  entityId: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  lastError: string | null;
  createdAt: string;
}

export interface SyncStats {
  pending: number;
  syncing: number;
  failed: number;
  total: number;
}

// ─── Navigation Types ───────────────────────

export interface WizardRouteParams {
  projectId: string;
  submissionId: string;
}

// ─── Form Types ─────────────────────────────

export interface AnswerState {
  [questionKey: string]: {
    value: string | null;
    isNa: boolean;
  };
}

export interface ContactFormData {
  name: string;
  title: string;
  phone: string;
  email: string;
  company: string;
  roleType: ContactRoleType;
  notes: string;
}
