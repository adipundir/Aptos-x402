/**
 * Agent Storage
 * Neon PostgreSQL storage for agent configurations
 */

import { db, agents, type Agent, type NewAgent } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

// Re-export types for compatibility
export type { Agent };

// Generate unique ID
function generateId(): string {
  return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all agents, optionally filtered by userId
 */
export async function getAllAgents(userId?: string): Promise<Agent[]> {
  if (userId) {
    return await db.select().from(agents).where(eq(agents.userId, userId));
  }
  return await db.select().from(agents);
}

/**
 * Get agent by ID, optionally filtered by userId for security
 */
export async function getAgentById(id: string, userId?: string): Promise<Agent | null> {
  if (userId) {
    const result = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.userId, userId)))
      .limit(1);
    return result[0] || null;
  }
  const result = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
  return result[0] || null;
}

/**
 * Create a new agent
 */
export async function createAgent(
  agentData: Omit<NewAgent, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Agent> {
  const newAgent: NewAgent = {
    ...agentData,
    id: generateId(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const [created] = await db.insert(agents).values(newAgent).returning();
  return created;
}

/**
 * Update an agent
 */
export async function updateAgent(
  id: string,
  updates: Partial<Omit<NewAgent, 'id' | 'createdAt' | 'walletAddress' | 'privateKey'>>,
  userId?: string
): Promise<Agent | null> {
  const updateData = {
    ...updates,
    updatedAt: new Date(),
  };

  if (userId) {
    const [updated] = await db
      .update(agents)
      .set(updateData)
      .where(and(eq(agents.id, id), eq(agents.userId, userId)))
      .returning();
    return updated || null;
  }

  const [updated] = await db.update(agents).set(updateData).where(eq(agents.id, id)).returning();
  return updated || null;
}

/**
 * Delete an agent
 */
export async function deleteAgent(id: string, userId?: string): Promise<boolean> {
  if (userId) {
    const result = await db
      .delete(agents)
      .where(and(eq(agents.id, id), eq(agents.userId, userId)))
      .returning();
    return result.length > 0;
  }

  const result = await db.delete(agents).where(eq(agents.id, id)).returning();
  return result.length > 0;
}

/**
 * Client-safe version (without private key)
 */
export function getAgentForClient(agent: Agent): Omit<Agent, 'privateKey'> {
  const { privateKey, ...clientSafe } = agent;
  return clientSafe;
}
