/**
 * ARC-8004 On-Chain Provider Interface
 * 
 * Abstracts blockchain operations for ARC-8004, allowing:
 * - Null implementation for off-chain only mode
 * - Aptos implementation for full on-chain support
 * - Custom implementations for other blockchains
 * 
 * @packageDocumentation
 */

import type { Account } from '@aptos-labs/ts-sdk';
import type { AgentCard, FeedbackSubmission, TaskValidationRequest } from '../types';

// ============================================
// On-Chain Provider Interface
// ============================================

/**
 * Result of minting an identity NFT on-chain
 */
export interface MintIdentityResult {
  /** On-chain token address */
  tokenAddress: string;
  /** Transaction hash */
  txHash: string;
}

/**
 * Result of verifying an identity on-chain
 */
export interface VerifyIdentityResult {
  /** Transaction hash */
  txHash: string;
}

/**
 * Result of creating an on-chain attestation
 */
export interface AttestationResult {
  /** Attestation/transaction hash */
  attestationHash: string;
}

/**
 * On-chain agent score data
 */
export interface OnChainAgentScore {
  /** Total sum of all scores received */
  totalScore: number;
  /** Number of feedback submissions */
  feedbackCount: number;
  /** Average score scaled by 100 (e.g., 450 = 4.50) */
  averageScoreScaled: number;
  /** Computed trust level (0-5) */
  trustLevel: number;
  /** Last update timestamp (unix seconds) */
  lastUpdated: number;
}

/**
 * Interface for on-chain operations
 * Implement this interface to provide custom blockchain integration
 */
export interface OnChainProvider {
  /**
   * Whether on-chain operations are enabled
   */
  readonly enabled: boolean;

  /**
   * Mint an agent identity NFT on-chain
   * 
   * @param agentId - Unique agent identifier
   * @param agentCard - Agent metadata
   * @param signer - Account to sign the transaction
   * @returns Token address and transaction hash
   */
  mintIdentity(
    agentId: string,
    agentCard: AgentCard,
    signer: Account
  ): Promise<MintIdentityResult>;

  /**
   * Verify an agent identity on-chain
   * 
   * @param tokenAddress - On-chain token address
   * @param signer - Admin account to sign verification
   * @returns Transaction hash
   */
  verifyIdentity(
    tokenAddress: string,
    signer: Account
  ): Promise<VerifyIdentityResult>;

  /**
   * Create an on-chain feedback attestation
   * 
   * @param agentId - Agent receiving feedback
   * @param clientAddress - Address of client giving feedback
   * @param score - Overall score (1-5)
   * @param paymentHash - Optional related payment hash
   * @param signer - Account to sign the transaction
   * @returns Attestation hash
   */
  attestFeedback(
    agentId: string,
    clientAddress: string,
    score: number,
    paymentHash: string | undefined,
    signer: Account
  ): Promise<AttestationResult>;

  /**
   * Submit a task validation on-chain
   * 
   * @param taskId - Task identifier
   * @param agentId - Agent that performed the task
   * @param validatorId - Validator identifier
   * @param proof - Optional cryptographic proof
   * @param signer - Account to sign the transaction
   * @returns Attestation hash
   */
  submitValidation(
    taskId: string,
    agentId: string,
    validatorId: string,
    proof: string | undefined,
    signer: Account
  ): Promise<AttestationResult>;

  /**
   * Check if an identity exists on-chain
   * 
   * @param tokenAddress - Token address to check
   * @returns Whether the identity exists
   */
  identityExists(tokenAddress: string): Promise<boolean>;

  /**
   * Get account balance (for checking if account can pay fees)
   * 
   * @param address - Account address
   * @returns Balance in native units (e.g., octas for Aptos)
   */
  getAccountBalance(address: string): Promise<bigint>;

  /**
   * Get aggregated agent score from on-chain
   * 
   * @param agentId - Agent identifier
   * @returns On-chain agent score data or null if not found
   */
  getAgentScore(agentId: string): Promise<OnChainAgentScore | null>;

  /**
   * Check if an agent has any on-chain reputation
   * 
   * @param agentId - Agent identifier
   * @returns Whether the agent has on-chain reputation data
   */
  hasOnChainReputation(agentId: string): Promise<boolean>;
}

// ============================================
// Null On-Chain Provider
// ============================================

/**
 * Null implementation of OnChainProvider
 * Used when on-chain operations are disabled
 * All operations return empty results or throw appropriate errors
 */
export class NullOnChainProvider implements OnChainProvider {
  readonly enabled = false;

  async mintIdentity(): Promise<MintIdentityResult> {
    throw new Error('On-chain operations are disabled. Set onChainEnabled: true to enable.');
  }

  async verifyIdentity(): Promise<VerifyIdentityResult> {
    throw new Error('On-chain operations are disabled. Set onChainEnabled: true to enable.');
  }

  async attestFeedback(): Promise<AttestationResult> {
    // For attestations, we can silently skip rather than throw
    return { attestationHash: '' };
  }

  async submitValidation(): Promise<AttestationResult> {
    // For validations, we can silently skip rather than throw
    return { attestationHash: '' };
  }

  async identityExists(): Promise<boolean> {
    return false;
  }

  async getAccountBalance(): Promise<bigint> {
    return BigInt(0);
  }

  async getAgentScore(): Promise<OnChainAgentScore | null> {
    return null;
  }

  async hasOnChainReputation(): Promise<boolean> {
    return false;
  }
}

// ============================================
// Aptos On-Chain Provider
// ============================================

/**
 * Aptos blockchain implementation of OnChainProvider
 */
export class AptosOnChainProvider implements OnChainProvider {
  readonly enabled = true;
  private moduleAddress: string;

  constructor(
    private aptos: import('@aptos-labs/ts-sdk').Aptos,
    moduleAddress: string
  ) {
    this.moduleAddress = moduleAddress;
  }

  async mintIdentity(
    agentId: string,
    agentCard: AgentCard,
    signer: Account
  ): Promise<MintIdentityResult> {
    // Generate metadata URI (data URL with JSON)
    const metadataUri = `data:application/json;base64,${Buffer.from(JSON.stringify(agentCard)).toString('base64')}`;

    const transaction = await this.aptos.transaction.build.simple({
      sender: signer.accountAddress,
      data: {
        function: `${this.moduleAddress}::agent_identity::mint_identity`,
        functionArguments: [
          agentId,
          agentCard.name,
          metadataUri,
          JSON.stringify(agentCard.capabilities),
        ],
      },
    });

    const committed = await this.aptos.signAndSubmitTransaction({
      signer,
      transaction,
    });

    await this.aptos.waitForTransaction({ transactionHash: committed.hash });

    // Extract token address from events
    const tokenAddress = await this.extractTokenAddressFromTx(committed.hash);

    return {
      tokenAddress,
      txHash: committed.hash,
    };
  }

  async verifyIdentity(
    tokenAddress: string,
    signer: Account
  ): Promise<VerifyIdentityResult> {
    const transaction = await this.aptos.transaction.build.simple({
      sender: signer.accountAddress,
      data: {
        function: `${this.moduleAddress}::agent_identity::verify_identity`,
        functionArguments: [tokenAddress],
      },
    });

    const committed = await this.aptos.signAndSubmitTransaction({
      signer,
      transaction,
    });

    await this.aptos.waitForTransaction({ transactionHash: committed.hash });

    return { txHash: committed.hash };
  }

  async attestFeedback(
    agentId: string,
    clientAddress: string,
    score: number,
    paymentHash: string | undefined,
    signer: Account
  ): Promise<AttestationResult> {
    const transaction = await this.aptos.transaction.build.simple({
      sender: signer.accountAddress,
      data: {
        function: `${this.moduleAddress}::reputation::attest_feedback`,
        functionArguments: [
          agentId,
          clientAddress,
          score,
          paymentHash || '',
        ],
      },
    });

    const committed = await this.aptos.signAndSubmitTransaction({
      signer,
      transaction,
    });

    await this.aptos.waitForTransaction({ transactionHash: committed.hash });

    return { attestationHash: committed.hash };
  }

  async submitValidation(
    taskId: string,
    agentId: string,
    validatorId: string,
    proof: string | undefined,
    signer: Account
  ): Promise<AttestationResult> {
    const transaction = await this.aptos.transaction.build.simple({
      sender: signer.accountAddress,
      data: {
        function: `${this.moduleAddress}::validation::submit_validation`,
        functionArguments: [
          taskId,
          agentId,
          validatorId,
          proof || '',
        ],
      },
    });

    const committed = await this.aptos.signAndSubmitTransaction({
      signer,
      transaction,
    });

    await this.aptos.waitForTransaction({ transactionHash: committed.hash });

    return { attestationHash: committed.hash };
  }

  async identityExists(tokenAddress: string): Promise<boolean> {
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

  async getAccountBalance(address: string): Promise<bigint> {
    try {
      return BigInt(await this.aptos.getAccountAPTAmount({ accountAddress: address }));
    } catch {
      return BigInt(0);
    }
  }

  async getAgentScore(agentId: string): Promise<OnChainAgentScore | null> {
    try {
      const result = await this.aptos.view({
        payload: {
          function: `${this.moduleAddress}::reputation::get_agent_score`,
          functionArguments: [agentId],
        },
      });

      // Result is tuple: (total_score, feedback_count, average_score_scaled, trust_level, last_updated)
      if (result && Array.isArray(result) && result.length >= 5) {
        const [totalScore, feedbackCount, averageScoreScaled, trustLevel, lastUpdated] = result;
        
        // If feedback count is 0, no reputation exists
        if (Number(feedbackCount) === 0) {
          return null;
        }

        return {
          totalScore: Number(totalScore),
          feedbackCount: Number(feedbackCount),
          averageScoreScaled: Number(averageScoreScaled),
          trustLevel: Number(trustLevel),
          lastUpdated: Number(lastUpdated),
        };
      }

      return null;
    } catch (error) {
      console.warn('[ARC8004] Failed to get agent score from chain:', error);
      return null;
    }
  }

  async hasOnChainReputation(agentId: string): Promise<boolean> {
    try {
      const result = await this.aptos.view({
        payload: {
          function: `${this.moduleAddress}::reputation::has_reputation`,
          functionArguments: [agentId],
        },
      });

      return result && Array.isArray(result) && result[0] === true;
    } catch {
      return false;
    }
  }

  /**
   * Extract token address from mint transaction events
   */
  private async extractTokenAddressFromTx(txHash: string): Promise<string> {
    const txDetails = await this.aptos.getTransactionByHash({ transactionHash: txHash });

    if (txDetails && 'events' in txDetails && Array.isArray(txDetails.events)) {
      // Look for IdentityCreated event
      const identityCreatedEvent = txDetails.events.find((event: Record<string, unknown>) => {
        const eventTypeStr = typeof event.type === 'string' ? event.type : '';
        return eventTypeStr.includes('IdentityCreated');
      });

      if (identityCreatedEvent && identityCreatedEvent.data) {
        const eventData = identityCreatedEvent.data as Record<string, string>;
        if (eventData.token_address) {
          return eventData.token_address;
        }
        if (eventData.token_addr) {
          return eventData.token_addr;
        }
      }
    }

    // Fallback: try to extract from transaction changes
    if (txDetails && 'changes' in txDetails && Array.isArray(txDetails.changes)) {
      const identityChange = txDetails.changes.find((change: Record<string, unknown>) => {
        const data = change.data as Record<string, unknown> | undefined;
        return data?.type && String(data.type).includes('agent_identity::AgentIdentity');
      }) as Record<string, unknown> | undefined;

      if (identityChange && typeof (identityChange as Record<string, unknown>).address === 'string') {
        return (identityChange as Record<string, unknown>).address as string;
      }
    }

    throw new Error('Failed to extract token address from mint transaction');
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create an on-chain provider based on configuration
 * 
 * @param config - Configuration options
 * @returns OnChainProvider instance
 * 
 * @example Disabled (null provider)
 * ```typescript
 * const provider = createOnChainProvider({ enabled: false });
 * ```
 * 
 * @example Aptos provider
 * ```typescript
 * const provider = createOnChainProvider({
 *   enabled: true,
 *   moduleAddress: '0x...',
 *   network: 'testnet',
 * });
 * ```
 */
export function createOnChainProvider(config: {
  enabled: boolean;
  moduleAddress?: string;
  network?: string;
}): OnChainProvider {
  if (!config.enabled) {
    return new NullOnChainProvider();
  }

  if (!config.moduleAddress) {
    console.warn('[ARC8004] On-chain enabled but moduleAddress not provided. Using NullOnChainProvider.');
    return new NullOnChainProvider();
  }

  // Lazy import Aptos client
  const { getAptosClient } = require('@/lib/aptos-utils');
  const aptos = getAptosClient(config.network || 'aptos-testnet');

  return new AptosOnChainProvider(aptos, config.moduleAddress);
}
