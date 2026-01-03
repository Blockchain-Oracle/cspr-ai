import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Drizzle client with schema for type-safe queries
export const db = drizzle(pool, { schema });

// Re-export schema types
export * from './schema';
