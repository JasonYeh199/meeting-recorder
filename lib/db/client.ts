import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';
import path from 'path';

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (_db) return _db;

  // Local dev without Turso → use local SQLite file via libsql
  // Vercel + Turso → use remote libsql URL
  const url = process.env.TURSO_URL ?? `file:${path.resolve('./dev.db')}`;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  const client = createClient({ url, authToken });
  _db = drizzle(client, { schema });
  return _db;
}
