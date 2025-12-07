/**
 * Database Connection
 * Neon serverless PostgreSQL connection using Drizzle ORM
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

let parsedUrl: URL;

try {
  parsedUrl = new URL(DATABASE_URL);
} catch (error) {
  throw new Error(
    'DATABASE_URL is not a valid URL. Expected a Postgres connection string like postgres://user:pass@host/db?sslmode=require'
  );
}

const isHttpProtocol = parsedUrl.protocol.startsWith('http');
const looksLikeNeonApiHost = parsedUrl.hostname.startsWith('api.');

if (isHttpProtocol || looksLikeNeonApiHost) {
  throw new Error(
    `DATABASE_URL host "${parsedUrl.hostname}" is not a valid Neon Postgres endpoint. Use the branch/pool connection string from the Neon console (host typically starts with "ep-" or "pooler-") and keep ?sslmode=require.`
  );
}

const sql = neon(DATABASE_URL);
export const db = drizzle(sql, { schema });

export * from './schema';

