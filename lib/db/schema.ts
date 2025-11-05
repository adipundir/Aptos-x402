/**
 * Database Schema
 * Drizzle ORM schema for Neon PostgreSQL database
 */

import { pgTable, text, timestamp, jsonb, varchar, index } from 'drizzle-orm/pg-core';

export const agents = pgTable('agents', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(), // User identifier (can be wallet address or session ID)
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  visibility: varchar('visibility', { length: 20 }).notNull().default('private'), // 'public' | 'private'
  walletAddress: varchar('wallet_address', { length: 255 }).notNull(),
  privateKey: text('private_key').notNull(), // Encrypted server-side, never exposed to client
  apiIds: jsonb('api_ids').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  agentsUserIdx: index('agents_user_idx').on(table.userId),
  agentsVisibilityIdx: index('agents_visibility_idx').on(table.visibility),
  agentsCreatedAtIdx: index('agents_created_at_idx').on(table.createdAt),
}));

export const chatThreads = pgTable('chat_threads', {
  id: varchar('id', { length: 255 }).primaryKey(),
  agentId: varchar('agent_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(), // User identifier
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
    paymentAmount?: string; // Amount in Octas
    error?: string;
    llmUsed?: string;
  }>(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});

export const userWallets = pgTable('user_wallets', {
  userId: varchar('user_id', { length: 255 }).primaryKey(), // User identifier (UUID)
  walletAddress: varchar('wallet_address', { length: 255 }).notNull(),
  privateKey: text('private_key').notNull(), // Encrypted server-side, never exposed to client
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userWalletsUserIdx: index('user_wallets_user_idx').on(table.userId),
}));

// Type exports for use in storage functions
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type ChatThread = typeof chatThreads.$inferSelect;
export type NewChatThread = typeof chatThreads.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type UserWallet = typeof userWallets.$inferSelect;
export type NewUserWallet = typeof userWallets.$inferInsert;

