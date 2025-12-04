-- Migration: Fix auth tables and add agent wallets
-- This migration updates the auth tables to match NextAuth.js expectations
-- and adds a new agent_wallets table for per-agent wallets

-- ============================================
-- Drop old tables if they exist (be careful in production!)
-- ============================================

-- Drop old payment_wallets (we're moving to agent_wallets)
DROP TABLE IF EXISTS "payment_wallets" CASCADE;

-- Drop old user_wallets if exists
DROP TABLE IF EXISTS "user_wallets" CASCADE;

-- ============================================
-- Recreate auth tables with correct structure
-- ============================================

-- Drop and recreate accounts table with correct structure
DROP TABLE IF EXISTS "accounts" CASCADE;

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
);

CREATE INDEX "accounts_user_idx" ON "accounts"("user_id");

-- Drop and recreate sessions table
DROP TABLE IF EXISTS "sessions" CASCADE;

CREATE TABLE "sessions" (
  "session_token" varchar(255) PRIMARY KEY,
  "user_id" varchar(255) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "expires" timestamp NOT NULL
);

CREATE INDEX "sessions_user_idx" ON "sessions"("user_id");

-- Drop and recreate verification_tokens table
DROP TABLE IF EXISTS "verification_tokens" CASCADE;

CREATE TABLE "verification_tokens" (
  "identifier" varchar(255) NOT NULL,
  "token" varchar(255) NOT NULL,
  "expires" timestamp NOT NULL,
  PRIMARY KEY ("identifier", "token")
);

-- ============================================
-- Create agent_wallets table
-- ============================================

CREATE TABLE IF NOT EXISTS "agent_wallets" (
  "id" varchar(255) PRIMARY KEY,
  "agent_id" varchar(255) NOT NULL UNIQUE,
  "wallet_address" varchar(255) NOT NULL UNIQUE,
  "public_key" text NOT NULL,
  "private_key_encrypted" text NOT NULL,
  "private_key_iv" text NOT NULL,
  "private_key_tag" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT NOW(),
  "updated_at" timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX "agent_wallets_agent_idx" ON "agent_wallets"("agent_id");
CREATE INDEX "agent_wallets_address_idx" ON "agent_wallets"("wallet_address");

-- ============================================
-- Update users table to ensure correct structure
-- ============================================

-- Add unique constraint on email if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_email_unique'
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE ("email");
  END IF;
END $$;

