/**
 * ARC-8004 SDK Client
 * 
 * A clean, easy-to-use client for ARC-8004 that works without database setup.
 * Supports both in-memory (for SDK users) and database (for production) storage.
 * 
 * @packageDocumentation
 */

import type { Account } from '@aptos-labs/ts-sdk';
import type {
  AgentCard,
  AgentIdentity,
  RegisterIdentityRequest,
  RegisterIdentityResponse,
  FeedbackSubmission,
  FeedbackRecord,
  AgentReputationScore,
  TaskValidationRequest,
  TaskValidation,
  ValidationResult,
  ARC8004Config,
  ValidationType,
} from '../../lib/arc8004/types';
import { resolveARC8004Config, TrustLevel } from '../../lib/arc8004/types';
import type {
  ARC8004StorageProvider,
  IdentityStorageProvider,
  ReputationStorageProvider,
  ValidationStorageProvider,
} from '../../lib/arc8004/storage/types';
import { createStorage } from '../../lib/arc8004/storage';
import type { OnChainProvider } from '../../lib/arc8004/chain/types';
import { createOnChainProvider } from '../../lib/arc8004/chain';
import { validateAgentCard } from '../../lib/arc8004/identity/agent-card';
import { calculateTrustLevel, calculateSuccessRate, calculateAverage, getTrustLevelLabel } from '../../lib/arc8004/reputation/scoring';

// ============================================
// ARC-8004 Client
// ============================================

/**
 * ARC-8004 Client Options
 */
export interface ARC8004ClientOptions {
  /**
   * Configuration for ARC-8004
   */
  config?: Partial<ARC8004Config>;

  /**
   * Custom storage provider (overrides storageType in config)
   */
  storage?: ARC8004StorageProvider;

  /**
   * Custom on-chain provider (overrides onChainEnabled in config)
   */
  chain?: OnChainProvider;
}

/**
 * ARC-8004 Client
 * 
 * Main entry point for ARC-8004 functionality.
 * Provides unified access to identity, reputation, and validation registries.
 * 
 * @example Basic usage with memory storage (default)
 * ```typescript
 * const client = await createARC8004Client();
 * 
 * // Register an identity
 * const identity = await client.identity.register({
 *   agentId: 'my-agent',
 *   agentCard: {
 *     name: 'My Agent',
 *     description: 'A helpful agent',
 *     version: '1.0.0',
 *     capabilities: ['payment'],
 *     protocols: ['x402'],
 *     supportedNetworks: ['aptos-testnet'],
 *     owner: { address: '0x...', publicKey: '0x...' },
 *   },
 * });
 * ```
 * 
 * @example With database storage
 * ```typescript
 * const client = await createARC8004Client({
 *   config: { storageType: 'database' },
 * });
 * ```
 * 
 * @example With on-chain enabled
 * ```typescript
 * const client = await createARC8004Client({
 *   config: {
 *     storageType: 'database',
 *     onChainEnabled: true,
 *     moduleAddress: '0x...',
 *   },
 * });
 * ```
 */
export class ARC8004Client {
  readonly config: ARC8004Config;
  readonly identity: IdentityClient;
  readonly reputation: ReputationClient;
  readonly validation: ValidationClient;

  private constructor(
    config: ARC8004Config,
    storage: ARC8004StorageProvider,
    chain: OnChainProvider
  ) {
    this.config = config;
    this.identity = new IdentityClient(storage.identity, chain, config);
    this.reputation = new ReputationClient(storage.reputation, chain, config);
    this.validation = new ValidationClient(storage.validation, chain, config);
  }

  /**
   * Create a new ARC8004Client instance
   * @internal Use createARC8004Client factory function instead
   */
  static async create(options?: ARC8004ClientOptions): Promise<ARC8004Client> {
    const config = resolveARC8004Config(options?.config);

    // Create or use provided storage
    const storage = options?.storage || await createStorage({
      type: config.storageType,
      skipAgentValidation: config.skipAgentValidation,
    });

    // Create or use provided chain provider
    const chain = options?.chain || createOnChainProvider({
      enabled: config.onChainEnabled,
      moduleAddress: config.moduleAddress,
      network: config.network,
    });

    return new ARC8004Client(config, storage, chain);
  }

  /**
   * Check if on-chain operations are enabled
   */
  get isOnChainEnabled(): boolean {
    return this.config.onChainEnabled;
  }

  /**
   * Get the current storage type
   */
  get storageType(): string {
    return this.config.storageType;
  }
}

// ============================================
// Identity Client
// ============================================

/**
 * Client for identity operations
 */
export class IdentityClient {
  constructor(
    private storage: IdentityStorageProvider,
    private chain: OnChainProvider,
    private config: ARC8004Config
  ) {}

  /**
   * Register a new agent identity
   * 
   * @param request - Registration request with agentId and agentCard
   * @returns Registered identity
   * @throws Error if agent card is invalid or identity already exists
   */
  async register(request: RegisterIdentityRequest): Promise<RegisterIdentityResponse> {
    // Validate agent card
    const validation = validateAgentCard(request.agentCard);
    if (!validation.valid) {
      throw new Error(`Invalid agent card: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Check agent exists (unless skipAgentValidation)
    if (!this.config.skipAgentValidation) {
      const agentExists = await this.storage.agentExists(request.agentId);
      if (!agentExists) {
        throw new Error(`Agent not found: ${request.agentId}`);
      }
    }

    // Check if identity already exists
    const existingIdentity = await this.storage.identityExists(request.agentId);
    if (existingIdentity) {
      throw new Error(`Identity already exists for agent: ${request.agentId}`);
    }

    // Create identity
    const identity = await this.storage.createIdentity({
      agentId: request.agentId,
      walletAddress: request.agentCard.owner.address,
      agentCard: request.agentCard,
      verified: false,
    });

    return { identity };
  }

  /**
   * Get identity by agent ID
   */
  async get(agentId: string): Promise<AgentIdentity | null> {
    return this.storage.getIdentity(agentId);
  }

  /**
   * Get identity by wallet address
   */
  async getByAddress(address: string): Promise<AgentIdentity | null> {
    return this.storage.getIdentityByAddress(address);
  }

  /**
   * Get identity by on-chain token address
   */
  async getByTokenAddress(tokenAddress: string): Promise<AgentIdentity | null> {
    return this.storage.getIdentityByTokenAddress(tokenAddress);
  }

  /**
   * Update agent card metadata
   */
  async updateAgentCard(
    agentId: string,
    updates: Partial<Omit<AgentCard, 'owner' | 'version'>>
  ): Promise<AgentIdentity | null> {
    const existing = await this.storage.getIdentity(agentId);
    if (!existing) {
      throw new Error(`Identity not found for agent: ${agentId}`);
    }

    const updatedCard: AgentCard = {
      ...existing.agentCard,
      ...updates,
      owner: existing.agentCard.owner,
      version: existing.agentCard.version,
    };

    const validation = validateAgentCard(updatedCard);
    if (!validation.valid) {
      throw new Error(`Invalid agent card: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    return this.storage.updateIdentity(agentId, { agentCard: updatedCard });
  }

  /**
   * Mint identity NFT on-chain
   * 
   * @param agentId - Agent ID to mint identity for
   * @param signer - Account to sign the transaction
   * @returns Token address and transaction hash
   * @throws Error if on-chain is disabled or identity not found
   */
  async mintOnChain(
    agentId: string,
    signer: Account
  ): Promise<{ tokenAddress: string; txHash: string }> {
    if (!this.chain.enabled) {
      throw new Error('On-chain operations are disabled');
    }

    const identity = await this.storage.getIdentity(agentId);
    if (!identity) {
      throw new Error(`Identity not found for agent: ${agentId}`);
    }

    const result = await this.chain.mintIdentity(agentId, identity.agentCard, signer);

    // Update storage with token address
    await this.storage.updateIdentity(agentId, {
      tokenAddress: result.tokenAddress,
      mintTransactionHash: result.txHash,
    });

    return result;
  }

  /**
   * Verify identity (optionally on-chain)
   * 
   * @param agentId - Agent ID to verify
   * @param verifiedBy - Verifier identifier
   * @param signer - Optional account for on-chain verification
   */
  async verify(
    agentId: string,
    verifiedBy: string,
    signer?: Account
  ): Promise<{ identity: AgentIdentity; txHash?: string }> {
    const existing = await this.storage.getIdentity(agentId);
    if (!existing) {
      throw new Error(`Identity not found for agent: ${agentId}`);
    }

    let txHash: string | undefined;

    // Verify on-chain if enabled and signer provided
    if (this.chain.enabled && signer && existing.tokenAddress) {
      const result = await this.chain.verifyIdentity(existing.tokenAddress, signer);
      txHash = result.txHash;
    }

    // Update storage
    const now = new Date();
    const updated = await this.storage.updateIdentity(agentId, {
      verified: true,
      verifiedAt: now,
      verifiedBy,
    });

    if (!updated) {
      throw new Error(`Failed to update identity for agent: ${agentId}`);
    }

    return { identity: updated, txHash };
  }

  /**
   * List all identities
   */
  async list(options?: { verified?: boolean; limit?: number }): Promise<AgentIdentity[]> {
    return this.storage.listIdentities(options);
  }

  /**
   * Delete an identity
   */
  async delete(agentId: string): Promise<boolean> {
    return this.storage.deleteIdentity(agentId);
  }

  /**
   * Check if identity exists on-chain
   */
  async existsOnChain(tokenAddress: string): Promise<boolean> {
    return this.chain.identityExists(tokenAddress);
  }
}

// ============================================
// Reputation Client
// ============================================

/**
 * Client for reputation operations
 */
export class ReputationClient {
  constructor(
    private storage: ReputationStorageProvider,
    private chain: OnChainProvider,
    private config: ARC8004Config
  ) {}

  /**
   * Submit feedback for an agent
   * 
   * @param feedback - Feedback submission
   * @param signer - Optional account for on-chain attestation
   * @returns Feedback ID and optional attestation hash
   */
  async submitFeedback(
    feedback: FeedbackSubmission,
    signer?: Account
  ): Promise<{ feedbackId: string; attestationHash?: string }> {
    // Validate feedback
    this.validateFeedback(feedback);

    // Check agent exists (unless skipAgentValidation)
    if (!this.config.skipAgentValidation) {
      const agentExists = await this.storage.agentExists(feedback.agentId);
      if (!agentExists) {
        throw new Error(`Agent not found: ${feedback.agentId}`);
      }
    }

    // Create feedback record
    const record = await this.storage.createFeedback(feedback);

    // Create on-chain attestation if enabled and signer provided
    let attestationHash: string | undefined;
    if (this.chain.enabled && signer) {
      const result = await this.chain.attestFeedback(
        feedback.agentId,
        feedback.clientAddress,
        feedback.overallScore,
        feedback.paymentHash,
        signer
      );
      attestationHash = result.attestationHash;

      if (attestationHash) {
        await this.storage.updateFeedbackAttestation(record.id, attestationHash);
        await this.storage.updateAttestationHash(feedback.agentId, attestationHash);
      }
    }

    return { feedbackId: record.id, attestationHash };
  }

  /**
   * Get agent reputation score
   */
  async getReputation(agentId: string): Promise<AgentReputationScore | null> {
    return this.storage.getReputation(agentId);
  }

  /**
   * Get feedback history for an agent
   */
  async getFeedbackHistory(
    agentId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<FeedbackRecord[]> {
    return this.storage.getFeedbackHistory(agentId, options);
  }

  /**
   * Get trust level label for an agent
   */
  async getTrustLevel(agentId: string): Promise<{ level: number; label: string } | null> {
    const reputation = await this.storage.getReputation(agentId);
    if (!reputation) return null;

    return {
      level: reputation.trustLevel,
      label: getTrustLevelLabel(reputation.trustLevel),
    };
  }

  /**
   * Record a transaction (success/failure)
   */
  async recordTransaction(agentId: string, successful: boolean): Promise<void> {
    await this.storage.recordTransaction(agentId, successful);
  }

  /**
   * Delete all reputation data for an agent
   */
  async delete(agentId: string): Promise<boolean> {
    return this.storage.deleteReputation(agentId);
  }

  private validateFeedback(feedback: FeedbackSubmission): void {
    if (!feedback.agentId) {
      throw new Error('Agent ID is required');
    }
    if (!feedback.clientAddress) {
      throw new Error('Client address is required');
    }
    if (feedback.overallScore < 1 || feedback.overallScore > 5) {
      throw new Error('Overall score must be between 1 and 5');
    }
    if (feedback.reliabilityScore !== undefined &&
        (feedback.reliabilityScore < 1 || feedback.reliabilityScore > 5)) {
      throw new Error('Reliability score must be between 1 and 5');
    }
    if (feedback.speedScore !== undefined &&
        (feedback.speedScore < 1 || feedback.speedScore > 5)) {
      throw new Error('Speed score must be between 1 and 5');
    }
    if (feedback.accuracyScore !== undefined &&
        (feedback.accuracyScore < 1 || feedback.accuracyScore > 5)) {
      throw new Error('Accuracy score must be between 1 and 5');
    }
  }
}

// ============================================
// Validation Client
// ============================================

/**
 * Validation types that are fully implemented
 */
const IMPLEMENTED_VALIDATION_TYPES: ValidationType[] = ['manual'];

/**
 * Validation types coming soon
 */
const COMING_SOON_VALIDATION_TYPES: ValidationType[] = ['zkproof', 'tee', 'oracle'];

/**
 * Client for validation operations
 */
export class ValidationClient {
  constructor(
    private storage: ValidationStorageProvider,
    private chain: OnChainProvider,
    private config: ARC8004Config
  ) {}

  /**
   * Submit a task validation
   * 
   * @param request - Validation request
   * @param signer - Optional account for on-chain attestation
   * @returns Validation ID and optional attestation hash
   * @throws Error if validation type is not implemented
   */
  async submitValidation(
    request: TaskValidationRequest,
    signer?: Account
  ): Promise<{ validationId: string; attestationHash?: string }> {
    // Validate request
    this.validateRequest(request);

    // Check agent exists (unless skipAgentValidation)
    if (!this.config.skipAgentValidation) {
      const agentExists = await this.storage.agentExists(request.agentId);
      if (!agentExists) {
        throw new Error(`Agent not found: ${request.agentId}`);
      }
    }

    // Check for existing validation
    const existing = await this.storage.getValidationByTaskAndValidator(
      request.taskId,
      request.validatorId
    );
    if (existing) {
      throw new Error(
        `Validation already exists for task ${request.taskId} by validator ${request.validatorId}`
      );
    }

    // Create validation record
    const validation = await this.storage.createValidation(request);

    // Create on-chain attestation if enabled and signer provided
    let attestationHash: string | undefined;
    if (this.chain.enabled && signer) {
      const result = await this.chain.submitValidation(
        request.taskId,
        request.agentId,
        request.validatorId,
        request.proof,
        signer
      );
      attestationHash = result.attestationHash;

      if (attestationHash) {
        await this.storage.updateValidation(validation.id, { attestationHash });
      }
    }

    return { validationId: validation.id, attestationHash };
  }

  /**
   * Approve a validation
   */
  async approve(validationId: string, proof?: string): Promise<TaskValidation> {
    const updated = await this.storage.updateValidation(validationId, {
      status: 'validated',
      proof,
      validatedAt: new Date(),
    });

    if (!updated) {
      throw new Error(`Validation not found: ${validationId}`);
    }

    return updated;
  }

  /**
   * Reject a validation
   */
  async reject(validationId: string): Promise<TaskValidation> {
    const updated = await this.storage.updateValidation(validationId, {
      status: 'rejected',
      validatedAt: new Date(),
    });

    if (!updated) {
      throw new Error(`Validation not found: ${validationId}`);
    }

    return updated;
  }

  /**
   * Get validation by ID
   */
  async get(validationId: string): Promise<TaskValidation | null> {
    return this.storage.getValidation(validationId);
  }

  /**
   * Get validation by task ID
   */
  async getByTaskId(taskId: string): Promise<TaskValidation | null> {
    return this.storage.getValidationByTaskId(taskId);
  }

  /**
   * Verify task for payment settlement
   * 
   * @param taskId - Task ID to verify
   * @param agentId - Expected agent ID
   * @returns Validation result
   */
  async verifyForPayment(taskId: string, agentId: string): Promise<ValidationResult> {
    const validation = await this.storage.getValidationByTaskId(taskId);

    if (!validation) {
      return {
        taskId,
        isValid: false,
        validatorId: 'system',
        timestamp: Date.now(),
      };
    }

    if (validation.agentId !== agentId) {
      return {
        taskId,
        isValid: false,
        validatorId: validation.validatorId,
        timestamp: Date.now(),
      };
    }

    return {
      taskId,
      isValid: validation.status === 'validated',
      validatorId: validation.validatorId,
      proof: validation.proof,
      attestationHash: validation.attestationHash,
      timestamp: validation.validatedAt?.getTime() || Date.now(),
    };
  }

  /**
   * List validations for an agent
   */
  async listForAgent(
    agentId: string,
    options?: { status?: 'pending' | 'validated' | 'rejected'; limit?: number }
  ): Promise<TaskValidation[]> {
    return this.storage.listValidationsForAgent(agentId, options);
  }

  /**
   * Delete a validation
   */
  async delete(validationId: string): Promise<boolean> {
    return this.storage.deleteValidation(validationId);
  }

  /**
   * Check if a validation type is implemented
   */
  isTypeImplemented(type: ValidationType): boolean {
    return IMPLEMENTED_VALIDATION_TYPES.includes(type);
  }

  /**
   * Get list of coming soon validation types
   */
  getComingSoonTypes(): ValidationType[] {
    return [...COMING_SOON_VALIDATION_TYPES];
  }

  private validateRequest(request: TaskValidationRequest): void {
    if (!request.taskId) {
      throw new Error('Task ID is required');
    }
    if (!request.agentId) {
      throw new Error('Agent ID is required');
    }
    if (!request.validatorId) {
      throw new Error('Validator ID is required');
    }

    // Check validation type
    const validTypes: ValidationType[] = ['manual', 'zkproof', 'tee', 'oracle'];
    if (!validTypes.includes(request.validationType)) {
      throw new Error(`Invalid validation type: ${request.validationType}`);
    }

    // Check if type is implemented
    if (COMING_SOON_VALIDATION_TYPES.includes(request.validationType)) {
      throw new Error(
        `Validation type '${request.validationType}' is coming soon. ` +
        `Currently supported types: ${IMPLEMENTED_VALIDATION_TYPES.join(', ')}`
      );
    }
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create an ARC-8004 client
 * 
 * This is the main entry point for using ARC-8004 in your application.
 * 
 * @param options - Client configuration options
 * @returns Promise resolving to ARC8004Client
 * 
 * @example Minimal setup (memory storage, no on-chain)
 * ```typescript
 * import { createARC8004Client } from '@x402/aptos/arc8004';
 * 
 * const client = await createARC8004Client();
 * ```
 * 
 * @example With database storage
 * ```typescript
 * const client = await createARC8004Client({
 *   config: { storageType: 'database' },
 * });
 * ```
 * 
 * @example Full production setup
 * ```typescript
 * const client = await createARC8004Client({
 *   config: {
 *     storageType: 'database',
 *     onChainEnabled: true,
 *     moduleAddress: process.env.ARC8004_MODULE_ADDRESS,
 *     network: 'mainnet',
 *   },
 * });
 * ```
 */
export async function createARC8004Client(options?: ARC8004ClientOptions): Promise<ARC8004Client> {
  return ARC8004Client.create(options);
}

// Re-export types for convenience
export { TrustLevel } from '../../lib/arc8004/types';
export type {
  AgentCard,
  AgentIdentity,
  RegisterIdentityRequest,
  RegisterIdentityResponse,
  FeedbackSubmission,
  FeedbackRecord,
  AgentReputationScore,
  TaskValidationRequest,
  TaskValidation,
  ValidationResult,
  ARC8004Config,
  ValidationType,
} from '../../lib/arc8004/types';
