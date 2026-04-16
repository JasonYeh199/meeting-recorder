import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env.local' });

const url = process.env.TURSO_URL ?? 'file:./dev.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'turso',
  dbCredentials: { url, authToken },
});
