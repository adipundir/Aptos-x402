/**
 * Database Schema
 * Drizzle ORM schema for Neon PostgreSQL database
 */

import { pgTable, text, timestamp, jsonb, varchar, index, integer, primaryKey, boolean, real } from 'drizzle-orm/pg-core';

// ============================================
// NextAuth.js tables (with correct column types)
// ============================================

export const users = pgTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const accounts = pgTable('accounts', {
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 255 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'), // Must be integer (Unix timestamp in seconds)
  token_type: varchar('token_type', { length: 255 }),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (table) => ({
  compoundKey: primaryKey({ columns: [table.provider, table.providerAccountId] }),
  accountsUserIdx: index('accounts_user_idx').on(table.userId),
}));

export const sessions = pgTable('sessions', {
  sessionToken: varchar('session_token', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}, (table) => ({
  sessionsUserIdx: index('sessions_user_idx').on(table.userId),
}));

export const verificationTokens = pgTable('verification_tokens', {
  identifier: varchar('identifier', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}, (table) => ({
  compoundKey: primaryKey({ columns: [table.identifier, table.token] }),
}));

// ============================================
// Agent Wallets - ONE wallet per AGENT
// ============================================

export const agentWallets = pgTable('agent_wallets', {
  id: varchar('id', { length: 255 }).primaryKey(),
  agentId: varchar('agent_id', { length: 255 }).notNull().unique(), // One wallet per agent
  walletAddress: varchar('wallet_address', { length: 255 }).notNull().unique(),
  publicKey: text('public_key').notNull(),
  privateKeyEncrypted: text('private_key_encrypted').notNull(),
  privateKeyIV: text('private_key_iv').notNull(),
  privateKeyTag: text('private_key_tag').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  agentWalletsAgentIdx: index('agent_wallets_agent_idx').on(table.agentId),
  agentWalletsAddressIdx: index('agent_wallets_address_idx').on(table.walletAddress),
}));

// ============================================
// Agents - with wallet reference
// ============================================

export const agents = pgTable('agents', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  visibility: varchar('visibility', { length: 20 }).notNull().default('private'), // 'public' | 'private'
  apiIds: jsonb('api_ids').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  agentsUserIdx: index('agents_user_idx').on(table.userId),
  agentsVisibilityIdx: index('agents_visibility_idx').on(table.visibility),
  agentsCreatedAtIdx: index('agents_created_at_idx').on(table.createdAt),
}));

// ============================================
// Chat tables
// ============================================

export const chatThreads = pgTable('chat_threads', {
  id: varchar('id', { length: 255 }).primaryKey(),
  agentId: varchar('agent_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  chatThreadsUserIdx: index('chat_threads_user_idx').on(table.userId),
  chatThreadsAgentIdx: index('chat_threads_agent_idx').on(table.agentId),
  chatThreadsUpdatedAtIdx: index('chat_threads_updated_at_idx').on(table.updatedAt),
}));

export const chatMessages = pgTable('chat_messages', {
  id: varchar('id', { length: 255 }).primaryKey(),
  threadId: varchar('thread_id', { length: 255 }).notNull().references(() => chatThreads.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(), // 'user' | 'agent'
  content: text('content').notNull(),
  metadata: jsonb('metadata').$type<{
    apiCalled?: string;
    paymentHash?: string;
    paymentAmount?: string;
    error?: string;
    llmUsed?: string;
  }>(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});

// ============================================
// Waitlist
// ============================================

export const waitlist = pgTable('waitlist', {
  id: varchar('id', { length: 255 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  apiType: text('api_type'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  waitlistEmailIdx: index('waitlist_email_idx').on(table.email),
  waitlistCreatedAtIdx: index('waitlist_created_at_idx').on(table.createdAt),
}));

// ============================================
// ARC-8004: Agent Identity Registry
// ============================================

/**
 * Agent Card metadata type (stored as JSONB)
 * Off-chain metadata linked to on-chain identity
 */
export interface AgentCardMetadata {
  name: string;
  description: string;
  version: string;
  capabilities: string[];           // e.g., ["payment", "data-fetch", "llm-interaction"]
  protocols: string[];              // e.g., ["x402", "http", "websocket"]
  supportedNetworks: string[];      // e.g., ["aptos-mainnet", "aptos-testnet"]
  endpoints?: {
    api?: string;
    webhook?: string;
  };
  owner: {
    address: string;
    publicKey: string;
  };
  metadata?: Record<string, unknown>;
}

export const agentIdentities = pgTable('agent_identities', {
  id: varchar('id', { length: 255 }).primaryKey(),
  agentId: varchar('agent_id', { length: 255 }).notNull().unique()
    .references(() => agents.id, { onDelete: 'cascade' }),
  
  // On-chain identity (Aptos Digital Asset / NFT)
  tokenAddress: varchar('token_address', { length: 255 }),
  tokenId: varchar('token_id', { length: 255 }),
  mintTransactionHash: varchar('mint_tx_hash', { length: 255 }),
  
  // Agent Card metadata (stored off-chain in DB, linked on-chain)
  agentCard: jsonb('agent_card').$type<AgentCardMetadata>().notNull(),
  
  // Verification status
  verified: boolean('verified').default(false),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: varchar('verified_by', { length: 255 }),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  agentIdentitiesAgentIdx: index('agent_identities_agent_idx').on(table.agentId),
  agentIdentitiesTokenIdx: index('agent_identities_token_idx').on(table.tokenAddress),
  agentIdentitiesVerifiedIdx: index('agent_identities_verified_idx').on(table.verified),
}));

// ============================================
// ARC-8004: Reputation Registry
// ============================================

export const agentReputations = pgTable('agent_reputations', {
  id: varchar('id', { length: 255 }).primaryKey(),
  agentId: varchar('agent_id', { length: 255 }).notNull().unique()
    .references(() => agents.id, { onDelete: 'cascade' }),
  
  // Aggregated scores
  totalScore: integer('total_score').default(0),
  totalFeedbackCount: integer('total_feedback_count').default(0),
  averageScore: real('average_score').default(0),
  
  // Category scores (1-5 scale)
  reliabilityScore: real('reliability_score').default(0),
  speedScore: real('speed_score').default(0),
  accuracyScore: real('accuracy_score').default(0),
  
  // Trust level (0-100)
  trustLevel: integer('trust_level').default(0),
  
  // Success metrics
  totalTransactions: integer('total_transactions').default(0),
  successfulTransactions: integer('successful_transactions').default(0),
  
  // On-chain attestation hash (latest)
  latestAttestationHash: varchar('latest_attestation_hash', { length: 255 }),
  
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  agentReputationsAgentIdx: index('agent_reputations_agent_idx').on(table.agentId),
  agentReputationsTrustIdx: index('agent_reputations_trust_idx').on(table.trustLevel),
}));

// ============================================
// ARC-8004: Reputation Feedback
// ============================================

export const reputationFeedback = pgTable('reputation_feedback', {
  id: varchar('id', { length: 255 }).primaryKey(),
  agentId: varchar('agent_id', { length: 255 }).notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  
  // Feedback source
  clientAddress: varchar('client_address', { length: 255 }).notNull(),
  jobId: varchar('job_id', { length: 255 }),
  
  // Scores (1-5)
  overallScore: integer('overall_score').notNull(),
  reliabilityScore: integer('reliability_score'),
  speedScore: integer('speed_score'),
  accuracyScore: integer('accuracy_score'),
  
  // Tags and comments
  tags: jsonb('tags').$type<string[]>().default([]),
  comment: text('comment'),
  
  // Payment reference (integrates with x402)
  paymentHash: varchar('payment_hash', { length: 255 }),
  paymentAmount: varchar('payment_amount', { length: 255 }),
  
  // On-chain attestation
  attestationHash: varchar('attestation_hash', { length: 255 }),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  reputationFeedbackAgentIdx: index('reputation_feedback_agent_idx').on(table.agentId),
  reputationFeedbackClientIdx: index('reputation_feedback_client_idx').on(table.clientAddress),
  reputationFeedbackCreatedIdx: index('reputation_feedback_created_idx').on(table.createdAt),
}));

// ============================================
// ARC-8004: Validation Registry
// ============================================

export const taskValidations = pgTable('task_validations', {
  id: varchar('id', { length: 255 }).primaryKey(),
  taskId: varchar('task_id', { length: 255 }).notNull(),
  agentId: varchar('agent_id', { length: 255 }).notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  
  // Validator info
  validatorId: varchar('validator_id', { length: 255 }).notNull(),
  validatorAddress: varchar('validator_address', { length: 255 }),
  validationType: varchar('validation_type', { length: 50 }).notNull(), // 'manual' | 'zkproof' | 'tee' | 'oracle'
  
  // Validation result
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'validated' | 'rejected'
  proof: text('proof'),
  
  // On-chain attestation
  attestationHash: varchar('attestation_hash', { length: 255 }),
  
  // Payment reference
  paymentHash: varchar('payment_hash', { length: 255 }),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  validatedAt: timestamp('validated_at'),
}, (table) => ({
  taskValidationsTaskIdx: index('task_validations_task_idx').on(table.taskId),
  taskValidationsAgentIdx: index('task_validations_agent_idx').on(table.agentId),
  taskValidationsStatusIdx: index('task_validations_status_idx').on(table.status),
}));

// ============================================
// Type exports
// ============================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;
export type AgentWallet = typeof agentWallets.$inferSelect;
export type NewAgentWallet = typeof agentWallets.$inferInsert;
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type ChatThread = typeof chatThreads.$inferSelect;
export type NewChatThread = typeof chatThreads.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type WaitlistEntry = typeof waitlist.$inferSelect;
export type NewWaitlistEntry = typeof waitlist.$inferInsert;

// ARC-8004 types
export type AgentIdentity = typeof agentIdentities.$inferSelect;
export type NewAgentIdentity = typeof agentIdentities.$inferInsert;
export type AgentReputation = typeof agentReputations.$inferSelect;
export type NewAgentReputation = typeof agentReputations.$inferInsert;
export type ReputationFeedback = typeof reputationFeedback.$inferSelect;
export type NewReputationFeedback = typeof reputationFeedback.$inferInsert;
export type TaskValidation = typeof taskValidations.$inferSelect;
export type NewTaskValidation = typeof taskValidations.$inferInsert;
