/**
 * Database Schema
 * Drizzle ORM schema for Neon PostgreSQL database
 */

import { pgTable, text, timestamp, jsonb, varchar, index, integer, primaryKey } from 'drizzle-orm/pg-core';

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
