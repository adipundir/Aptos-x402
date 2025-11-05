/**
 * Agent Storage
 * Neon PostgreSQL storage for agent configurations
 */

import { db, agents, type Agent, type NewAgent } from '@/lib/db';
import { eq, and, or } from 'drizzle-orm';

// Re-export types for compatibility
export type { Agent };

// Generate unique ID
function generateId(): string {
  return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all agents with different scopes
 * @param scope - 'mine' (user's agents), 'public' (all public agents), or undefined (user's agents + public agents)
 * @param userId - User ID for filtering
 */
export async function getAllAgents(scope?: 'mine' | 'public', userId?: string): Promise<Agent[]> {
  if (scope === 'public') {
    // Return only public agents
    return await db.select().from(agents).where(eq(agents.visibility, 'public'));
  }
  
  if (scope === 'mine' && userId) {
    // Return only user's agents
    return await db.select().from(agents).where(eq(agents.userId, userId));
  }
  
  if (userId) {
    // Return user's agents + public agents
    return await db
      .select()
      .from(agents)
      .where(
        or(
          eq(agents.userId, userId),
          eq(agents.visibility, 'public')
        )
      );
  }
  
  // No userId: return all public agents only
  return await db.select().from(agents).where(eq(agents.visibility, 'public'));
}

/**
 * Get agent by ID with access control
 * - If userId matches: return agent (owner access)
 * - If agent is public: return agent (public access)
 * - Otherwise: return null (no access)
 */
export async function getAgentById(id: string, userId?: string): Promise<Agent | null> {
  const result = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
  
  if (result.length === 0) {
    return null;
  }
  
  const agent = result[0];
  
  // Owner always has access
  if (userId && agent.userId === userId) {
    return agent;
  }
  
  // Public agents are accessible to everyone
  if (agent.visibility === 'public') {
    return agent;
  }
  
  // Private agent, not owner: no access
  return null;
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
