/**
 * Agent Storage
 * Neon PostgreSQL storage for agent configurations with wallet creation
 * Includes ARC-8004 identity registration
 */

import { db, agents, sql as rawSql, type Agent, type NewAgent } from '@/lib/db';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import { createAgentWallet, getAgentWalletPublic, deleteAgentWallet } from './agent-wallets';
import { IdentityRegistry } from '@/lib/arc8004/identity/registry';
import { createAgentCard } from '@/lib/arc8004/identity/agent-card';
import type { AgentIdentity } from '@/lib/arc8004/types';

// Re-export types for compatibility
export type { Agent };

// Agent with wallet info for client
export interface AgentWithWallet extends Agent {
  wallet?: {
    address: string;
    publicKey: string;
  } | null;
  identity?: AgentIdentity | null;
}

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
    return await db
      .select()
      .from(agents)
      .where(eq(agents.visibility, 'public'))
      .orderBy(desc(agents.createdAt));
  }

  if (scope === 'mine' && userId) {
    // Return only user's agents
    return await db
      .select()
      .from(agents)
      .where(eq(agents.userId, userId))
      .orderBy(desc(agents.createdAt));
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
      )
      .orderBy(desc(agents.createdAt));
  }

  // No userId: return all public agents only
  return await db
    .select()
    .from(agents)
    .where(eq(agents.visibility, 'public'))
    .orderBy(desc(agents.createdAt));
}

/**
 * Get agents with wallet info for client
 */
export async function getAgentsWithWallets(scope?: 'mine' | 'public', userId?: string): Promise<AgentWithWallet[]> {
  const agentList = await getAllAgents(scope, userId);

  // Fetch wallet + identity for each agent
  const agentsWithWallets = await Promise.all(
    agentList.map(async (agent) => {
      const wallet = await getAgentWalletPublic(agent.id);
      let identity: AgentIdentity | null = null;
      try {
        const registry = new IdentityRegistry();
        identity = await registry.resolveIdentity(agent.id);
      } catch (error) {
        // ignore identity errors
      }
      return {
        ...agent,
        wallet,
        identity,
      };
    })
  );

  return agentsWithWallets;
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
 * Get agent by ID with wallet info and identity
 */
export async function getAgentByIdWithWallet(id: string, userId?: string): Promise<AgentWithWallet | null> {
  const agent = await getAgentById(id, userId);

  if (!agent) return null;

  const wallet = await getAgentWalletPublic(agent.id);

  // Also fetch identity if available
  let identity: AgentIdentity | null = null;
  try {
    const registry = new IdentityRegistry();
    identity = await registry.resolveIdentity(agent.id);
  } catch (error) {
    // Silently fail if identity lookup fails
  }

  return {
    ...agent,
    wallet,
    identity,
  };
}

/**
 * Create a new agent with its own wallet and ARC-8004 identity
 */
export async function createAgent(
  agentData: Omit<NewAgent, 'id' | 'createdAt' | 'updatedAt'>
): Promise<AgentWithWallet> {
  // Ensure apiIds is properly formatted as an array
  const apiIds: string[] = Array.isArray(agentData.apiIds) ? agentData.apiIds : [];

  const agentId = generateId();

  // Create wallet for the agent FIRST (before inserting agent)
  // This is needed because the database may still have wallet_address as a required column
  const wallet = await createAgentWallet(agentId);

  const newAgent: NewAgent = {
    ...agentData,
    id: agentId,
    createdAt: new Date(),
    updatedAt: new Date(),
    apiIds,
  };

  // Create agent in database
  // Try normal Drizzle insert first, fallback to raw SQL if it fails (e.g., if wallet_address column exists)
  let created: Agent;
  try {
    const [inserted] = await db.insert(agents).values(newAgent).returning();
    if (!inserted) {
      throw new Error('Failed to create agent: no record returned');
    }
    created = inserted;
  } catch (error: any) {
    // If Drizzle insert fails, try raw SQL with wallet_address included
    // This handles the case where database schema still has wallet_address column
    console.warn('[createAgent] Drizzle insert failed, trying raw SQL with wallet_address:', error?.message || error);
    try {
      // Use raw SQL to insert with wallet_address
      const result = await rawSql`
        INSERT INTO agents (id, user_id, name, description, image_url, visibility, api_ids, wallet_address, created_at, updated_at)
        VALUES (${newAgent.id}, ${newAgent.userId}, ${newAgent.name}, ${newAgent.description || null}, ${newAgent.imageUrl || null}, ${newAgent.visibility}, ${JSON.stringify(newAgent.apiIds)}::jsonb, ${wallet.address}, ${newAgent.createdAt}, ${newAgent.updatedAt})
        RETURNING *
      `;
      // Convert result to Agent type
      const row = result[0] as any;
      created = {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        description: row.description,
        imageUrl: row.image_url,
        visibility: row.visibility,
        apiIds: row.api_ids,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
      console.log('[createAgent] Successfully created agent using raw SQL fallback');
    } catch (rawError: any) {
      console.error('[createAgent] Raw SQL insert also failed:', rawError);
      console.error('[createAgent] Original error:', error);
      // Clean up wallet if agent creation fails
      try {
        await deleteAgentWallet(agentId);
      } catch (cleanupError) {
        console.error('[createAgent] Failed to cleanup wallet after agent creation failure:', cleanupError);
      }
      throw rawError;
    }
  }

  console.log(`[Agent] Created agent ${created.id} with wallet ${wallet.address}`);

  // Auto-register ARC-8004 identity if enabled
  let identity: AgentIdentity | null = null;
  const arc8004Enabled = process.env.ARC8004_AUTO_REGISTER !== 'false';

  if (arc8004Enabled && wallet) {
    try {
      const registry = new IdentityRegistry();
      const agentCard = createAgentCard({
        name: created.name,
        description: created.description || `AI Agent: ${created.name}`,
        ownerAddress: wallet.address,
        ownerPublicKey: wallet.publicKey,
        capabilities: ['payment', 'data-fetch', 'llm-interaction'],
        protocols: ['x402', 'http'],
        supportedNetworks: ['aptos-testnet'],
      });

      const result = await registry.registerIdentity({
        agentId: created.id,
        agentCard,
      });

      identity = result.identity;
      console.log(`[Agent] Registered ARC-8004 identity for agent ${created.id}`);
    } catch (error) {
      // Log but don't fail agent creation if identity registration fails
      console.warn(`[Agent] Failed to register ARC-8004 identity for agent ${created.id}:`, error);
    }
  }

  return {
    ...created,
    wallet,
    identity,
  };
}

/**
 * Update an agent
 */
export async function updateAgent(
  id: string,
  updates: Partial<Omit<NewAgent, 'id' | 'createdAt'>>,
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
 * Delete an agent, its wallet, and ARC-8004 identity
 */
export async function deleteAgent(id: string, userId?: string): Promise<boolean> {
  let result;

  if (userId) {
    result = await db
      .delete(agents)
      .where(and(eq(agents.id, id), eq(agents.userId, userId)))
      .returning();
  } else {
    result = await db.delete(agents).where(eq(agents.id, id)).returning();
  }

  if (result.length > 0) {
    // Also delete the agent's wallet
    await deleteAgentWallet(id);

    // Also delete the agent's ARC-8004 identity
    try {
      const registry = new IdentityRegistry();
      await registry.deleteIdentity(id);
    } catch (error) {
      // Silently fail if identity deletion fails
      console.warn(`[Agent] Failed to delete ARC-8004 identity for agent ${id}:`, error);
    }

    return true;
  }

  return false;
}

/**
 * Client-safe version of agent (include wallet public info)
 */
export function getAgentForClient(agent: Agent | AgentWithWallet): AgentWithWallet {
  return agent as AgentWithWallet;
}
