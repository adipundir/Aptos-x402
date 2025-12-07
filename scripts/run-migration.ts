import { config } from 'dotenv';
config();

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function run() {
  console.log('Running full migration...');
  
  try {
    // Drop all old tables in correct order (respect foreign keys)
    console.log('Dropping old tables...');
    await sql`DROP TABLE IF EXISTS "chat_messages" CASCADE`;
    await sql`DROP TABLE IF EXISTS "chat_threads" CASCADE`;
    await sql`DROP TABLE IF EXISTS "agent_wallets" CASCADE`;
    await sql`DROP TABLE IF EXISTS "agents" CASCADE`;
    await sql`DROP TABLE IF EXISTS "payment_wallets" CASCADE`;
    await sql`DROP TABLE IF EXISTS "user_wallets" CASCADE`;
    await sql`DROP TABLE IF EXISTS "accounts" CASCADE`;
    await sql`DROP TABLE IF EXISTS "sessions" CASCADE`;
    await sql`DROP TABLE IF EXISTS "verification_tokens" CASCADE`;
    await sql`DROP TABLE IF EXISTS "waitlist" CASCADE`;
    await sql`DROP TABLE IF EXISTS "users" CASCADE`;
    
    // Create users table first (required by other tables)
    console.log('Creating users table...');
    await sql`
      CREATE TABLE "users" (
        "id" varchar(255) PRIMARY KEY,
        "name" varchar(255),
        "email" varchar(255) UNIQUE,
        "email_verified" timestamp,
        "image" text,
        "created_at" timestamp NOT NULL DEFAULT NOW(),
        "updated_at" timestamp NOT NULL DEFAULT NOW()
      )
    `;
    
    // Create accounts table
    console.log('Creating accounts table...');
    await sql`
      CREATE TABLE "accounts" (
        "user_id" varchar(255) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "type" varchar(255) NOT NULL,
        "provider" varchar(255) NOT NULL,
        "provider_account_id" varchar(255) NOT NULL,
        "refresh_token" text,
        "access_token" text,
        "expires_at" integer,
        "token_type" varchar(255),
        "scope" text,
        "id_token" text,
        "session_state" text,
        PRIMARY KEY ("provider", "provider_account_id")
      )
    `;
    await sql`CREATE INDEX "accounts_user_idx" ON "accounts"("user_id")`;
    
    // Create sessions table
    console.log('Creating sessions table...');
    await sql`
      CREATE TABLE "sessions" (
        "session_token" varchar(255) PRIMARY KEY,
        "user_id" varchar(255) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "expires" timestamp NOT NULL
      )
    `;
    await sql`CREATE INDEX "sessions_user_idx" ON "sessions"("user_id")`;
    
    // Create verification_tokens table
    console.log('Creating verification_tokens table...');
    await sql`
      CREATE TABLE "verification_tokens" (
        "identifier" varchar(255) NOT NULL,
        "token" varchar(255) NOT NULL,
        "expires" timestamp NOT NULL,
        PRIMARY KEY ("identifier", "token")
      )
    `;
    
    // Create agents table
    console.log('Creating agents table...');
    await sql`
      CREATE TABLE "agents" (
        "id" varchar(255) PRIMARY KEY,
        "user_id" varchar(255) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "name" varchar(255) NOT NULL,
        "description" text,
        "image_url" text,
        "visibility" varchar(20) NOT NULL DEFAULT 'private',
        "api_ids" jsonb NOT NULL DEFAULT '[]',
        "created_at" timestamp NOT NULL DEFAULT NOW(),
        "updated_at" timestamp NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX "agents_user_idx" ON "agents"("user_id")`;
    await sql`CREATE INDEX "agents_visibility_idx" ON "agents"("visibility")`;
    await sql`CREATE INDEX "agents_created_at_idx" ON "agents"("created_at")`;
    
    // Create agent_wallets table
    console.log('Creating agent_wallets table...');
    await sql`
      CREATE TABLE "agent_wallets" (
        "id" varchar(255) PRIMARY KEY,
        "agent_id" varchar(255) NOT NULL UNIQUE,
        "wallet_address" varchar(255) NOT NULL UNIQUE,
        "public_key" text NOT NULL,
        "private_key_encrypted" text NOT NULL,
        "private_key_iv" text NOT NULL,
        "private_key_tag" text NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT NOW(),
        "updated_at" timestamp NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX "agent_wallets_agent_idx" ON "agent_wallets"("agent_id")`;
    await sql`CREATE INDEX "agent_wallets_address_idx" ON "agent_wallets"("wallet_address")`;
    
    // Create chat_threads table
    console.log('Creating chat_threads table...');
    await sql`
      CREATE TABLE "chat_threads" (
        "id" varchar(255) PRIMARY KEY,
        "agent_id" varchar(255) NOT NULL,
        "user_id" varchar(255) NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT NOW(),
        "updated_at" timestamp NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX "chat_threads_user_idx" ON "chat_threads"("user_id")`;
    await sql`CREATE INDEX "chat_threads_agent_idx" ON "chat_threads"("agent_id")`;
    await sql`CREATE INDEX "chat_threads_updated_at_idx" ON "chat_threads"("updated_at")`;
    
    // Create chat_messages table
    console.log('Creating chat_messages table...');
    await sql`
      CREATE TABLE "chat_messages" (
        "id" varchar(255) PRIMARY KEY,
        "thread_id" varchar(255) NOT NULL REFERENCES "chat_threads"("id") ON DELETE CASCADE,
        "role" varchar(20) NOT NULL,
        "content" text NOT NULL,
        "metadata" jsonb,
        "timestamp" timestamp NOT NULL DEFAULT NOW()
      )
    `;
    
    // Create waitlist table
    console.log('Creating waitlist table...');
    await sql`
      CREATE TABLE "waitlist" (
        "id" varchar(255) PRIMARY KEY,
        "email" varchar(255) NOT NULL,
        "api_type" text,
        "created_at" timestamp NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX "waitlist_email_idx" ON "waitlist"("email")`;
    await sql`CREATE INDEX "waitlist_created_at_idx" ON "waitlist"("created_at")`;
    
    console.log('✅ Full migration completed successfully!');
  } catch (error: any) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

run();
