/**
 * Test database connection
 */

import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

console.log('Testing database connection...');
console.log(`Database URL: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`); // Hide password

const sql = neon(DATABASE_URL);

async function testConnection() {
  try {
    const startTime = Date.now();
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    const duration = Date.now() - startTime;
    
    console.log('✅ Database connection successful!');
    console.log(`Response time: ${duration}ms`);
    console.log('Current time:', result[0].current_time);
    console.log('PostgreSQL version:', result[0].pg_version.split(' ')[0] + ' ' + result[0].pg_version.split(' ')[1]);
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Database connection failed:');
    console.error('Error:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
    process.exit(1);
  }
}

testConnection();







