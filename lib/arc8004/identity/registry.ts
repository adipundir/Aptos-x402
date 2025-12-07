/**
 * ARC-8004 Identity Registry
 * Manages on-chain agent identities using Aptos Digital Assets
 */

import { Aptos, Account } from '@aptos-labs/ts-sdk';
import { eq } from 'drizzle-orm';
import { getAptosClient } from '@/lib/aptos-utils';
import { db } from '@/lib/db';
import { agentIdentities, agents } from '@/lib/db/schema';
import type { 
  AgentCard, 
  AgentIdentity, 
  RegisterIdentityRequest, 
  RegisterIdentityResponse,
  ARC8004Config,
} from '../types';
import { DEFAULT_ARC8004_CONFIG } from '../types';
import { createAgentCard, validateAgentCard, generateMetadataUri } from './agent-card';

/**
 * Generate unique ID for identity records
 */
function generateIdentityId(): string {
  return `identity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * ARC-8004 Identity Registry
 * Manages agent identities with optional on-chain NFT minting
 */
export class IdentityRegistry {
  private aptos: Aptos;
  private network: string;
  private moduleAddress: string;
  private config: ARC8004Config;

  constructor(config?: Partial<ARC8004Config>) {
    this.config = { ...DEFAULT_ARC8004_CONFIG, ...config };
    this.network = this.config.network;
    this.moduleAddress = this.config.moduleAddress || process.env.ARC8004_MODULE_ADDRESS || '';
    this.aptos = getAptosClient(this.network);
  }

  /**
   * Register a new agent identity
   */
  async registerIdentity(
    request: RegisterIdentityRequest
  ): Promise<RegisterIdentityResponse> {
    // Validate agent card
    const validation = validateAgentCard(request.agentCard);
    if (!validation.valid) {
      throw new Error(`Invalid agent card: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Check if agent exists
    const agentResult = await db
      .select()
      .from(agents)
      .where(eq(agents.id, request.agentId))
      .limit(1);

    if (agentResult.length === 0) {
      throw new Error(`Agent not found: ${request.agentId}`);
    }

    // Check if identity already exists
    const existingIdentity = await db
      .select()
      .from(agentIdentities)
      .where(eq(agentIdentities.agentId, request.agentId))
      .limit(1);

    if (existingIdentity.length > 0) {
      throw new Error(`Identity already exists for agent: ${request.agentId}`);
    }

    // Create identity record
    const identityId = generateIdentityId();
    const now = new Date();

    const [created] = await db.insert(agentIdentities).values({
      id: identityId,
      agentId: request.agentId,
      agentCard: request.agentCard,
      verified: false,
      createdAt: now,
      updatedAt: now,
    }).returning();

    const identity: AgentIdentity = {
      id: created.id,
      agentId: created.agentId,
      walletAddress: request.agentCard.owner.address,
      agentCard: created.agentCard,
      verified: created.verified || false,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };

    return {
      identity,
    };
  }

  /**
   * Mint identity NFT on-chain (requires signer)
   */
  async mintIdentityOnChain(
    agentId: string,
    signer: Account
  ): Promise<{ tokenAddress: string; transactionHash: string }> {
    if (!this.moduleAddress) {
      throw new Error('Module address not configured. Set ARC8004_MODULE_ADDRESS env variable.');
    }

    // Get identity from database
    const identity = await this.resolveIdentity(agentId);
    if (!identity) {
      throw new Error(`Identity not found for agent: ${agentId}`);
    }

    // Generate metadata URI
    const metadataUri = generateMetadataUri(identity.agentCard);

    // Build and submit transaction
    const transaction = await this.aptos.transaction.build.simple({
      sender: signer.accountAddress,
      data: {
        function: `${this.moduleAddress}::agent_identity::mint_identity`,
        functionArguments: [
          agentId,
          identity.agentCard.name,
          metadataUri,
          JSON.stringify(identity.agentCard.capabilities),
        ],
      },
    });

    const committed = await this.aptos.signAndSubmitTransaction({
      signer,
      transaction,
    });

    await this.aptos.waitForTransaction({ transactionHash: committed.hash });

    // Update database with on-chain info
    await db
      .update(agentIdentities)
      .set({
        tokenAddress: signer.accountAddress.toString(),
        mintTransactionHash: committed.hash,
        updatedAt: new Date(),
      })
      .where(eq(agentIdentities.agentId, agentId));

    return {
      tokenAddress: signer.accountAddress.toString(),
      transactionHash: committed.hash,
    };
  }

  /**
   * Resolve agent identity by agent ID
   */
  async resolveIdentity(agentId: string): Promise<AgentIdentity | null> {
    const result = await db
      .select()
      .from(agentIdentities)
      .where(eq(agentIdentities.agentId, agentId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const record = result[0];
    return {
      id: record.id,
      agentId: record.agentId,
      walletAddress: record.agentCard.owner.address,
      tokenAddress: record.tokenAddress || undefined,
      tokenId: record.tokenId || undefined,
      mintTransactionHash: record.mintTransactionHash || undefined,
      agentCard: record.agentCard,
      verified: record.verified || false,
      verifiedAt: record.verifiedAt || undefined,
      verifiedBy: record.verifiedBy || undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  /**
   * Resolve identity by wallet address
   */
  async resolveIdentityByAddress(walletAddress: string): Promise<AgentIdentity | null> {
    // Query all identities and filter by owner address in agentCard
    const results = await db.select().from(agentIdentities);
    
    for (const record of results) {
      if (record.agentCard.owner.address === walletAddress) {
        return {
          id: record.id,
          agentId: record.agentId,
          walletAddress: record.agentCard.owner.address,
          tokenAddress: record.tokenAddress || undefined,
          tokenId: record.tokenId || undefined,
          mintTransactionHash: record.mintTransactionHash || undefined,
          agentCard: record.agentCard,
          verified: record.verified || false,
          verifiedAt: record.verifiedAt || undefined,
          verifiedBy: record.verifiedBy || undefined,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        };
      }
    }
    
    return null;
  }

  /**
   * Update agent card metadata
   */
  async updateAgentCard(
    agentId: string,
    updates: Partial<Omit<AgentCard, 'owner' | 'version'>>
  ): Promise<AgentIdentity> {
    const existing = await this.resolveIdentity(agentId);
    if (!existing) {
      throw new Error(`Identity not found for agent: ${agentId}`);
    }

    const updatedCard: AgentCard = {
      ...existing.agentCard,
      ...updates,
      // Preserve owner and version
      owner: existing.agentCard.owner,
      version: existing.agentCard.version,
    };

    // Validate updated card
    const validation = validateAgentCard(updatedCard);
    if (!validation.valid) {
      throw new Error(`Invalid agent card: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const [updated] = await db
      .update(agentIdentities)
      .set({
        agentCard: updatedCard,
        updatedAt: new Date(),
      })
      .where(eq(agentIdentities.agentId, agentId))
      .returning();

    return {
      ...existing,
      agentCard: updated.agentCard,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Verify an agent's identity (admin function)
   */
  async verifyIdentity(
    agentId: string,
    verifiedBy: string
  ): Promise<AgentIdentity> {
    const existing = await this.resolveIdentity(agentId);
    if (!existing) {
      throw new Error(`Identity not found for agent: ${agentId}`);
    }

    const now = new Date();
    const [updated] = await db
      .update(agentIdentities)
      .set({
        verified: true,
        verifiedAt: now,
        verifiedBy,
        updatedAt: now,
      })
      .where(eq(agentIdentities.agentId, agentId))
      .returning();

    return {
      ...existing,
      verified: true,
      verifiedAt: now,
      verifiedBy,
      updatedAt: now,
    };
  }

  /**
   * Verify identity exists on-chain
   */
  async verifyIdentityOnChain(tokenAddress: string): Promise<boolean> {
    if (!this.moduleAddress) {
      return false;
    }

    try {
      const resource = await this.aptos.getAccountResource({
        accountAddress: tokenAddress,
        resourceType: `${this.moduleAddress}::agent_identity::AgentIdentity`,
      });
      return !!resource;
    } catch {
      return false;
    }
  }

  /**
   * Delete an agent identity
   */
  async deleteIdentity(agentId: string): Promise<boolean> {
    const result = await db
      .delete(agentIdentities)
      .where(eq(agentIdentities.agentId, agentId))
      .returning();

    return result.length > 0;
  }

  /**
   * List all identities (with optional filters)
   */
  async listIdentities(options?: {
    verified?: boolean;
    limit?: number;
  }): Promise<AgentIdentity[]> {
    let query = db.select().from(agentIdentities);

    if (options?.verified !== undefined) {
      query = query.where(eq(agentIdentities.verified, options.verified)) as typeof query;
    }

    const results = await query.limit(options?.limit || 100);

    return results.map(record => ({
      id: record.id,
      agentId: record.agentId,
      walletAddress: record.agentCard.owner.address,
      tokenAddress: record.tokenAddress || undefined,
      tokenId: record.tokenId || undefined,
      mintTransactionHash: record.mintTransactionHash || undefined,
      agentCard: record.agentCard,
      verified: record.verified || false,
      verifiedAt: record.verifiedAt || undefined,
      verifiedBy: record.verifiedBy || undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }));
  }
}

