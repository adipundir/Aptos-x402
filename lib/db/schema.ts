/**
 * Database Schema
 * Drizzle ORM schema for Neon PostgreSQL database
 */

import { pgTable, text, timestamp, jsonb, varchar } from 'drizzle-orm/pg-core';

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
});

export const chatThreads = pgTable('chat_threads', {
  id: varchar('id', { length: 255 }).primaryKey(),
  agentId: varchar('agent_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(), // User identifier
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const chatMessages = pgTable('chat_messages', {
  id: varchar('id', { length: 255 }).primaryKey(),
  threadId: varchar('thread_id', { length: 255 }).notNull().references(() => chatThreads.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(), // 'user' | 'agent'
  content: text('content').notNull(),
  metadata: jsonb('metadata').$type<{
    apiCalled?: string;
    paymentHash?: string;
    error?: string;
    llmUsed?: string;
  }>(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});

// Type exports for use in storage functions
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type ChatThread = typeof chatThreads.$inferSelect;
export type NewChatThread = typeof chatThreads.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;

