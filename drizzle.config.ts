import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import { parse } from 'pg-connection-string';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const parsed = parse(process.env.DATABASE_URL);

const dbCredentials: any = {
  host: parsed.host || 'localhost',
  port: parsed.port ? Number(parsed.port) : 5432,
  user: parsed.user,
  password: parsed.password,
  database: parsed.database || '',
  ssl: false,
};
if (typeof parsed.ssl === 'boolean') {
  dbCredentials.ssl = parsed.ssl;
}

export default {
  schema: './shared/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials,
} satisfies Config;
