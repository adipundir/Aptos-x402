/**
 * Chat Storage
 * Neon PostgreSQL storage for chat conversations
 */

import { db, chatThreads, chatMessages, type ChatThread, type ChatMessage, type NewChatThread, type NewChatMessage } from '@/lib/db';
import { eq, and, desc } from 'drizzle-orm';

// Re-export types for compatibility
export type { ChatMessage, ChatThread };

// Generate unique ID
function generateId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get chat thread by agent ID and user ID
 */
export async function getChatByAgentId(agentId: string, userId: string): Promise<ChatThread | null> {
  const result = await db
    .select()
    .from(chatThreads)
    .where(and(eq(chatThreads.agentId, agentId), eq(chatThreads.userId, userId)))
    .limit(1);
  return result[0] || null;
}

/**
 * Get or create a chat thread for an agent and user
 */
export async function getOrCreateChat(agentId: string, userId: string): Promise<ChatThread> {
  let chat = await getChatByAgentId(agentId, userId);
  
  if (!chat) {
    const newChat: NewChatThread = {
      id: generateId(),
      agentId,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const [created] = await db.insert(chatThreads).values(newChat).returning();
    chat = created;
  }
  
  return chat;
}

/**
 * Get all messages for a chat thread
 */
export async function getChatMessages(threadId: string): Promise<ChatMessage[]> {
  return await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.threadId, threadId))
    .orderBy(desc(chatMessages.timestamp));
}

/**
 * Get full chat thread with messages
 */
export async function getChatWithMessages(agentId: string, userId: string): Promise<{
  thread: ChatThread;
  messages: ChatMessage[];
} | null> {
  const thread = await getChatByAgentId(agentId, userId);
  if (!thread) {
    return null;
  }
  
  const messages = await getChatMessages(thread.id);
  return { thread, messages };
}

/**
 * Add a message to a chat thread
 */
export async function addMessage(
  agentId: string,
  userId: string,
  message: {
    role: 'user' | 'agent';
    content: string;
    metadata?: {
      apiCalled?: string;
      paymentHash?: string;
      paymentAmount?: string; // Amount in Octas
      error?: string;
      llmUsed?: string;
    } | null;
  }
): Promise<ChatMessage> {
  // Get or create thread
  const thread = await getOrCreateChat(agentId, userId);
  
  // Add message
  const newMessage: NewChatMessage = {
    role: message.role,
    content: message.content,
    metadata: message.metadata || null,
    id: generateMessageId(),
    threadId: thread.id,
    timestamp: new Date(),
  };
  
  const [created] = await db.insert(chatMessages).values(newMessage).returning();
  
  // Update thread's updatedAt timestamp
  await db
    .update(chatThreads)
    .set({ updatedAt: new Date() })
    .where(eq(chatThreads.id, thread.id));
  
  return created;
}

/**
 * Clear all messages from a chat thread
 */
export async function clearChat(agentId: string, userId: string): Promise<boolean> {
  const thread = await getChatByAgentId(agentId, userId);
  if (!thread) {
    return false;
  }
  
  await db.delete(chatMessages).where(eq(chatMessages.threadId, thread.id));
  
  // Update thread's updatedAt timestamp
  await db
    .update(chatThreads)
    .set({ updatedAt: new Date() })
    .where(eq(chatThreads.id, thread.id));
  
  return true;
}
