import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

let _db: ReturnType<typeof createDb> | null = null;
let _migrated = false;

function resolveSqlitePath(): string {
  const raw = process.env.DATABASE_URL ?? '';
  // Accept "file:./foo.db" or a bare path like "./foo.db"
  // Ignore PostgreSQL/MySQL URLs
  if (!raw || raw.startsWith('postgresql') || raw.startsWith('postgres') || raw.startsWith('mysql')) {
    return path.resolve('./dev.db');
  }
  return path.resolve(raw.replace(/^file:/, ''));
}

function createDb() {
  const dbPath = resolveSqlitePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema });

  if (!_migrated) {
    _migrated = true;
    migrate(db, { migrationsFolder: path.resolve('./lib/db/migrations') });
  }

  return db;
}

export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}
