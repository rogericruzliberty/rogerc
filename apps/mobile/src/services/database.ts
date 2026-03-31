/**
 * Liberty Field App — Local SQLite Database
 *
 * Offline-first local storage using expo-sqlite.
 * Mirrors the server schema for submissions, answers,
 * contacts, and file attachments, plus a sync_queue table.
 *
 * Uses WAL mode for concurrent read/write performance.
 */

import * as SQLite from 'expo-sqlite';

// ─── Database Instance ──────────────────────

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;

  _db = await SQLite.openDatabaseAsync('liberty_field.db');

  // Enable WAL mode for better concurrent performance
  await _db.execAsync('PRAGMA journal_mode = WAL');
  await _db.execAsync('PRAGMA foreign_keys = ON');

  // Run migrations
  await runMigrations(_db);

  return _db;
}

// Convenience export (initialized after first call to getDatabase)
export let db: SQLite.SQLiteDatabase;

export async function initDatabase(): Promise<void> {
  db = await getDatabase();
}

// ─── Migrations ─────────────────────────────

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  // Create migrations tracking table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Run each migration in order
  for (const migration of MIGRATIONS) {
    const existing = await database.getFirstAsync<{ name: string }>(
      'SELECT name FROM _migrations WHERE name = ?',
      [migration.name],
    );

    if (!existing) {
      console.log(`[DB] Running migration: ${migration.name}`);
      await database.execAsync(migration.sql);
      await database.runAsync(
        'INSERT INTO _migrations (name) VALUES (?)',
        [migration.name],
      );
    }
  }
}

interface Migration {
  name: string;
  sql: string;
}

const MIGRATIONS: Migration[] = [
  {
    name: '001_initial_schema',
    sql: `
      -- Projects (cached from server)
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        suite_number TEXT,
        client_name TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        synced_at TEXT
      );

      -- Submissions
      CREATE TABLE IF NOT EXISTS submissions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id),
        user_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'DRAFT',
        site_name TEXT,
        location_lat REAL,
        location_lng REAL,
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT,
        synced_at TEXT
      );

      -- Answers (one per question per submission)
      CREATE TABLE IF NOT EXISTS answers (
        id TEXT PRIMARY KEY,
        submission_id TEXT NOT NULL REFERENCES submissions(id),
        question_key TEXT NOT NULL,
        value TEXT,
        is_na INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(submission_id, question_key)
      );

      -- Contacts
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        submission_id TEXT NOT NULL REFERENCES submissions(id),
        name TEXT NOT NULL,
        title TEXT,
        phone TEXT,
        email TEXT,
        company TEXT,
        role_type TEXT NOT NULL DEFAULT 'OTHER',
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- File attachments
      CREATE TABLE IF NOT EXISTS file_attachments (
        id TEXT PRIMARY KEY,
        submission_id TEXT NOT NULL REFERENCES submissions(id),
        type TEXT NOT NULL,
        filename TEXT NOT NULL,
        mime_type TEXT,
        size_bytes INTEGER,
        local_uri TEXT,
        remote_url TEXT,
        s3_key TEXT,
        upload_status TEXT NOT NULL DEFAULT 'pending',
        retry_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Sync queue
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        retry_count INTEGER NOT NULL DEFAULT 0,
        error_msg TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        processed_at TEXT
      );

      -- Indexes for common queries
      CREATE INDEX IF NOT EXISTS idx_submissions_project ON submissions(project_id);
      CREATE INDEX IF NOT EXISTS idx_answers_submission ON answers(submission_id);
      CREATE INDEX IF NOT EXISTS idx_contacts_submission ON contacts(submission_id);
      CREATE INDEX IF NOT EXISTS idx_attachments_submission ON file_attachments(submission_id);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, created_at);
      CREATE INDEX IF NOT EXISTS idx_attachments_upload_status ON file_attachments(upload_status);
    `,
  },
  {
    name: '002_add_user_cache',
    sql: `
      CREATE TABLE IF NOT EXISTS user_cache (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at TEXT,
        cached_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `,
  },
];

// ─── Helper Functions ───────────────────────

/** Generate a UUID v4 for client-side record creation */
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Save an answer locally (upsert on submission_id + question_key) */
export async function saveAnswer(
  submissionId: string,
  questionKey: string,
  value: string | null,
  isNa: boolean,
): Promise<string> {
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO answers (id, submission_id, question_key, value, is_na, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(submission_id, question_key)
     DO UPDATE SET value = excluded.value, is_na = excluded.is_na, updated_at = excluded.updated_at`,
    [id, submissionId, questionKey, value, isNa ? 1 : 0, now],
  );

  return id;
}

/** Get all answers for a submission */
export async function getAnswers(
  submissionId: string,
): Promise<Record<string, { value: string | null; isNa: boolean }>> {
  const rows = await db.getAllAsync<{
    question_key: string;
    value: string | null;
    is_na: number;
  }>(
    'SELECT question_key, value, is_na FROM answers WHERE submission_id = ?',
    [submissionId],
  );

  const answers: Record<string, { value: string | null; isNa: boolean }> = {};
  for (const row of rows) {
    answers[row.question_key] = {
      value: row.value,
      isNa: row.is_na === 1,
    };
  }
  return answers;
}

/** Get pending sync count for the status badge */
export async function getPendingSyncCount(): Promise<number> {
  const result = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM sync_queue WHERE status IN ('pending', 'processing')",
  );
  return result?.count ?? 0;
}

/** Clean up completed sync items older than 7 days */
export async function cleanupSyncQueue(): Promise<void> {
  await db.runAsync(
    `DELETE FROM sync_queue
     WHERE status = 'completed'
     AND processed_at < datetime('now', '-7 days')`,
  );
}
