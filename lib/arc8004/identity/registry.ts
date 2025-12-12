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
import { resolveARC8004Config } from '../types';
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
    this.config = resolveARC8004Config(config);
    this.network = this.config.network;
    this.moduleAddress = this.config.moduleAddress;
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
    
    // Extract token address from IdentityCreated event
    let tokenAddress: string | undefined;
    const eventType = `${this.moduleAddress}::agent_identity::IdentityCreated`;
    
    try {
      // Get transaction details to access events
      const txDetails = await this.aptos.getTransactionByHash({ transactionHash: committed.hash });
      
      if (txDetails && 'events' in txDetails && Array.isArray(txDetails.events)) {
        const identityCreatedEvent = txDetails.events.find((event: any) => {
          const eventTypeStr = typeof event.type === 'string' ? event.type : 
                               (typeof event.type === 'object' && event.type !== null ? 
                                `${event.type.account_address}::${event.type.module_name}::${event.type.struct_name}` : 
                                '');
          return eventTypeStr.includes('IdentityCreated') || eventTypeStr === eventType;
        });
        
        if (identityCreatedEvent && identityCreatedEvent.data) {
          // The token_address is in the event data
          const eventData = identityCreatedEvent.data as any;
          if (eventData.token_address) {
            tokenAddress = eventData.token_address;
            console.log(`[IdentityRegistry] Extracted token address from event: ${tokenAddress}`);
          } else if (eventData.token_addr) {
            tokenAddress = eventData.token_addr;
            console.log(`[IdentityRegistry] Extracted token address from event (token_addr): ${tokenAddress}`);
          }
        }
      }
    } catch (error) {
      console.warn(`[IdentityRegistry] Failed to parse events for token address:`, error);
    }
    
    if (!tokenAddress) {
      // Fallback: try to derive token address from transaction changes
      // Look for the token object address in the changes
      try {
        const txDetails = await this.aptos.getTransactionByHash({ transactionHash: committed.hash });
        if (txDetails && 'changes' in txDetails && Array.isArray(txDetails.changes)) {
          // Find the change that created the AgentIdentity resource
          const identityChange = txDetails.changes.find((change: any) => {
            return change.data?.type?.includes('agent_identity::AgentIdentity');
          });
          
          if (identityChange && identityChange.address) {
            tokenAddress = identityChange.address;
            console.log(`[IdentityRegistry] Extracted token address from transaction changes: ${tokenAddress}`);
          }
        }
      } catch (error) {
        console.warn(`[IdentityRegistry] Failed to extract token address from changes:`, error);
      }
    }
    
    if (!tokenAddress) {
      throw new Error('Failed to extract token address from mint transaction. The identity may not have been minted correctly.');
    }

    // Update database with on-chain info
    await db
      .update(agentIdentities)
      .set({
        tokenAddress,
        mintTransactionHash: committed.hash,
        updatedAt: new Date(),
      })
      .where(eq(agentIdentities.agentId, agentId));

    return {
      tokenAddress,
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
   * If identity is not minted on-chain, mints it first using agentWalletSigner
   * Then verifies on-chain using adminSigner if provided
   * Returns the identity with optional on-chain transaction hashes
   */
  async verifyIdentity(
    agentId: string,
    verifiedBy: string,
    adminSigner?: Account,
    agentWalletSigner?: Account
  ): Promise<{ identity: AgentIdentity; mintTxHash?: string; verifyTxHash?: string }> {
    const existing = await this.resolveIdentity(agentId);
    if (!existing) {
      throw new Error(`Identity not found for agent: ${agentId}`);
    }

    const now = new Date();
    let mintTxHash: string | undefined;
    let verifyTxHash: string | undefined;
    
    // If identity is not minted on-chain yet, mint it first (prefer admin signer if available)
    if (!existing.tokenAddress && (adminSigner || agentWalletSigner) && this.moduleAddress) {
      try {
        const mintSigner = adminSigner || agentWalletSigner!;

        // Check balance before attempting to mint (on the signer used for minting)
        const balance = await this.aptos.getAccountAPTAmount({ 
          accountAddress: mintSigner.accountAddress 
        });
        const minBalance = BigInt(100000); // 0.0001 APT minimum for transaction fees
        
        if (balance < minBalance) {
          const balanceAPT = Number(balance) / 1e8;
          const walletAddress = mintSigner.accountAddress.toString();
          throw new Error(
            `Insufficient balance to mint identity on-chain. ` +
            `Mint signer (${walletAddress}) has ${balanceAPT.toFixed(8)} APT, ` +
            `but needs at least 0.0001 APT for transaction fees. ` +
            `Please fund this wallet first.`
          );
        }
        
        console.log(`[IdentityRegistry] Identity ${agentId} not minted yet. Minting on-chain first...`);
        console.log(`[IdentityRegistry] Mint signer balance: ${Number(balance) / 1e8} APT`);
        const mintResult = await this.mintIdentityOnChain(agentId, mintSigner);
        mintTxHash = mintResult.transactionHash;
        console.log(`[IdentityRegistry] ✅ Minted identity on-chain for agent ${agentId}, tx: ${mintTxHash}`);
        
        // Refresh identity to get the new tokenAddress
        const refreshed = await this.resolveIdentity(agentId);
        if (refreshed?.tokenAddress) {
          existing.tokenAddress = refreshed.tokenAddress;
        }
      } catch (error: any) {
        console.error(`[IdentityRegistry] ❌ Failed to mint identity on-chain:`, error.message || error);
        // Provide helpful error message for insufficient balance
        if (error.message?.includes('INSUFFICIENT_BALANCE') || error.message?.includes('Insufficient balance')) {
          throw error; // Re-throw with our improved message
        }
        throw new Error(`Failed to mint identity on-chain: ${error.message || error}`);
      }
    } else if (!existing.tokenAddress && !agentWalletSigner) {
      throw new Error(`Identity ${agentId} is not minted on-chain and no agent wallet signer provided. Cannot verify on-chain.`);
    }
    
    // If identity is minted on-chain and admin signer is provided, verify on-chain
    if (existing.tokenAddress && adminSigner && this.moduleAddress) {
      try {
        console.log(`[IdentityRegistry] Attempting on-chain verification for agent ${agentId}, tokenAddress: ${existing.tokenAddress}`);
        const result = await this.verifyIdentityOnChain(existing.tokenAddress, adminSigner);
        verifyTxHash = result.transactionHash;
        console.log(`[IdentityRegistry] ✅ Verified identity on-chain for agent ${agentId}, tx: ${verifyTxHash}`);
      } catch (error: any) {
        console.error(`[IdentityRegistry] ❌ Failed to verify on-chain:`, error.message || error);
        // Don't continue with database verification if on-chain fails - throw the error
        throw new Error(`On-chain verification failed: ${error.message || error}`);
      }
    } else if (existing.tokenAddress && !adminSigner) {
      console.warn(`[IdentityRegistry] Identity ${agentId} is minted on-chain but no admin signer provided. Only verifying in database.`);
    }

    // Update database verification status
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

    // Refresh identity to get latest tokenAddress if it was just minted
    const finalIdentity = await this.resolveIdentity(agentId);
    if (!finalIdentity) {
      throw new Error(`Identity not found after update for agent: ${agentId}`);
    }

    return {
      identity: {
        ...finalIdentity,
        verified: true,
        verifiedAt: now,
        verifiedBy,
        updatedAt: now,
      },
      mintTxHash,
      verifyTxHash,
    };
  }

  /**
   * Verify identity on-chain using Move contract (requires admin signer)
   */
  async verifyIdentityOnChain(
    tokenAddress: string,
    adminSigner: Account
  ): Promise<{ transactionHash: string }> {
    if (!this.moduleAddress) {
      throw new Error('Module address not configured. Set ARC8004_MODULE_ADDRESS env variable.');
    }

    // Build and submit verification transaction
    const transaction = await this.aptos.transaction.build.simple({
      sender: adminSigner.accountAddress,
      data: {
        function: `${this.moduleAddress}::agent_identity::verify_identity`,
        functionArguments: [tokenAddress],
      },
    });

    const committed = await this.aptos.signAndSubmitTransaction({
      signer: adminSigner,
      transaction,
    });

    await this.aptos.waitForTransaction({ transactionHash: committed.hash });

    return {
      transactionHash: committed.hash,
    };
  }

  /**
   * Check if identity exists on-chain (read-only check)
   */
  async checkIdentityExistsOnChain(tokenAddress: string): Promise<boolean> {
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

