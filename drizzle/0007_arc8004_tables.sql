-- ARC-8004: Agent Trust Layer Tables
-- Migration: 0007_arc8004_tables

-- ============================================
-- Agent Identities Table
-- ============================================
CREATE TABLE IF NOT EXISTS "agent_identities" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "agent_id" varchar(255) NOT NULL UNIQUE,
  "token_address" varchar(255),
  "token_id" varchar(255),
  "mint_tx_hash" varchar(255),
  "agent_card" jsonb NOT NULL,
  "verified" boolean DEFAULT false,
  "verified_at" timestamp,
  "verified_by" varchar(255),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Agent Identities Indexes
CREATE INDEX IF NOT EXISTS "agent_identities_agent_idx" ON "agent_identities" ("agent_id");
CREATE INDEX IF NOT EXISTS "agent_identities_token_idx" ON "agent_identities" ("token_address");
CREATE INDEX IF NOT EXISTS "agent_identities_verified_idx" ON "agent_identities" ("verified");

-- Foreign Key
DO $$ BEGIN
  ALTER TABLE "agent_identities" ADD CONSTRAINT "agent_identities_agent_id_agents_id_fk" 
  FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- Agent Reputations Table
-- ============================================
CREATE TABLE IF NOT EXISTS "agent_reputations" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "agent_id" varchar(255) NOT NULL UNIQUE,
  "total_score" integer DEFAULT 0,
  "total_feedback_count" integer DEFAULT 0,
  "average_score" real DEFAULT 0,
  "reliability_score" real DEFAULT 0,
  "speed_score" real DEFAULT 0,
  "accuracy_score" real DEFAULT 0,
  "trust_level" integer DEFAULT 0,
  "total_transactions" integer DEFAULT 0,
  "successful_transactions" integer DEFAULT 0,
  "latest_attestation_hash" varchar(255),
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Agent Reputations Indexes
CREATE INDEX IF NOT EXISTS "agent_reputations_agent_idx" ON "agent_reputations" ("agent_id");
CREATE INDEX IF NOT EXISTS "agent_reputations_trust_idx" ON "agent_reputations" ("trust_level");

-- Foreign Key
DO $$ BEGIN
  ALTER TABLE "agent_reputations" ADD CONSTRAINT "agent_reputations_agent_id_agents_id_fk" 
  FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- Reputation Feedback Table
-- ============================================
CREATE TABLE IF NOT EXISTS "reputation_feedback" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "agent_id" varchar(255) NOT NULL,
  "client_address" varchar(255) NOT NULL,
  "job_id" varchar(255),
  "overall_score" integer NOT NULL,
  "reliability_score" integer,
  "speed_score" integer,
  "accuracy_score" integer,
  "tags" jsonb DEFAULT '[]'::jsonb,
  "comment" text,
  "payment_hash" varchar(255),
  "payment_amount" varchar(255),
  "attestation_hash" varchar(255),
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Reputation Feedback Indexes
CREATE INDEX IF NOT EXISTS "reputation_feedback_agent_idx" ON "reputation_feedback" ("agent_id");
CREATE INDEX IF NOT EXISTS "reputation_feedback_client_idx" ON "reputation_feedback" ("client_address");
CREATE INDEX IF NOT EXISTS "reputation_feedback_created_idx" ON "reputation_feedback" ("created_at");

-- Foreign Key
DO $$ BEGIN
  ALTER TABLE "reputation_feedback" ADD CONSTRAINT "reputation_feedback_agent_id_agents_id_fk" 
  FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- Task Validations Table
-- ============================================
CREATE TABLE IF NOT EXISTS "task_validations" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "task_id" varchar(255) NOT NULL,
  "agent_id" varchar(255) NOT NULL,
  "validator_id" varchar(255) NOT NULL,
  "validator_address" varchar(255),
  "validation_type" varchar(50) NOT NULL,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "proof" text,
  "attestation_hash" varchar(255),
  "payment_hash" varchar(255),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "validated_at" timestamp
);

-- Task Validations Indexes
CREATE INDEX IF NOT EXISTS "task_validations_task_idx" ON "task_validations" ("task_id");
CREATE INDEX IF NOT EXISTS "task_validations_agent_idx" ON "task_validations" ("agent_id");
CREATE INDEX IF NOT EXISTS "task_validations_status_idx" ON "task_validations" ("status");

-- Foreign Key
DO $$ BEGIN
  ALTER TABLE "task_validations" ADD CONSTRAINT "task_validations_agent_id_agents_id_fk" 
  FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;








