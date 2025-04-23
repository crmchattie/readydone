import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Database connection string from environment variables
const connectionString = process.env.DATABASE_URL || '';

// Create Postgres client
const client = postgres(connectionString);

// Create Drizzle ORM instance with our schema
export const db = drizzle(client);

export async function getDb() {
  // This function can be used to get the database instance in async contexts
  return db;
} 