/**
 * ARC-8004 Storage Provider Interfaces
 * 
 * These interfaces abstract storage operations, allowing users to choose between:
 * - In-memory storage (for SDK/testing)
 * - PostgreSQL database storage (for production with persistence)
 * - Custom storage backends (for advanced use cases)
 * 
 * @packageDocumentation
 */

import type {
  AgentIdentity,
  AgentCard,
  FeedbackSubmission,
  FeedbackRecord,
  AgentReputationScore,
  TaskValidationRequest,
  TaskValidation,
  ValidationStatus,
} from '../types';

// ============================================
// Identity Storage Provider
// ============================================

/**
 * Options for listing identities
 */
export interface ListIdentitiesOptions {
  /** Filter by verification status */
  verified?: boolean;
  /** Maximum number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Interface for identity storage operations
 * Implement this interface to provide custom storage for agent identities
 */
export interface IdentityStorageProvider {
  /**
   * Create a new identity record
   */
  createIdentity(identity: Omit<AgentIdentity, 'id' | 'createdAt' | 'updatedAt'>): Promise<AgentIdentity>;

  /**
   * Get identity by agent ID
   */
  getIdentity(agentId: string): Promise<AgentIdentity | null>;

  /**
   * Get identity by wallet address
   */
  getIdentityByAddress(address: string): Promise<AgentIdentity | null>;

  /**
   * Get identity by token address (on-chain NFT address)
   */
  getIdentityByTokenAddress(tokenAddress: string): Promise<AgentIdentity | null>;

  /**
   * Update an existing identity
   */
  updateIdentity(agentId: string, updates: Partial<AgentIdentity>): Promise<AgentIdentity | null>;

  /**
   * Delete an identity
   */
  deleteIdentity(agentId: string): Promise<boolean>;

  /**
   * List all identities with optional filtering
   */
  listIdentities(options?: ListIdentitiesOptions): Promise<AgentIdentity[]>;

  /**
   * Check if an agent exists (for validation)
   * In memory mode, this can always return true or check against known IDs
   */
  agentExists(agentId: string): Promise<boolean>;

  /**
   * Check if identity already exists for agent
   */
  identityExists(agentId: string): Promise<boolean>;
}

// ============================================
// Reputation Storage Provider
// ============================================

/**
 * Options for listing feedback
 */
export interface ListFeedbackOptions {
  /** Maximum number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Interface for reputation storage operations
 * Implement this interface to provide custom storage for agent reputation
 */
export interface ReputationStorageProvider {
  /**
   * Create a feedback record
   */
  createFeedback(feedback: FeedbackSubmission): Promise<FeedbackRecord>;

  /**
   * Update feedback with attestation hash
   */
  updateFeedbackAttestation(feedbackId: string, attestationHash: string): Promise<void>;

  /**
   * Get aggregated reputation for an agent
   */
  getReputation(agentId: string): Promise<AgentReputationScore | null>;

  /**
   * Get feedback history for an agent
   */
  getFeedbackHistory(agentId: string, options?: ListFeedbackOptions): Promise<FeedbackRecord[]>;

  /**
   * Create or update aggregated reputation record
   */
  upsertReputation(agentId: string, reputation: Partial<AgentReputationScore>): Promise<void>;

  /**
   * Record a transaction (success/failure) for an agent
   */
  recordTransaction(agentId: string, successful: boolean): Promise<void>;

  /**
   * Update latest attestation hash for reputation
   */
  updateAttestationHash(agentId: string, attestationHash: string): Promise<void>;

  /**
   * Delete all reputation data for an agent
   */
  deleteReputation(agentId: string): Promise<boolean>;

  /**
   * Check if an agent exists (for validation)
   */
  agentExists(agentId: string): Promise<boolean>;
}

// ============================================
// Validation Storage Provider
// ============================================

/**
 * Options for listing validations
 */
export interface ListValidationsOptions {
  /** Filter by status */
  status?: ValidationStatus;
  /** Maximum number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Interface for validation storage operations
 * Implement this interface to provide custom storage for task validations
 */
export interface ValidationStorageProvider {
  /**
   * Create a validation record
   */
  createValidation(validation: TaskValidationRequest): Promise<TaskValidation>;

  /**
   * Get validation by ID
   */
  getValidation(validationId: string): Promise<TaskValidation | null>;

  /**
   * Get validation by task ID
   */
  getValidationByTaskId(taskId: string): Promise<TaskValidation | null>;

  /**
   * Get validations by task and validator (to check duplicates)
   */
  getValidationByTaskAndValidator(taskId: string, validatorId: string): Promise<TaskValidation | null>;

  /**
   * Update validation status and optionally proof
   */
  updateValidation(
    validationId: string,
    updates: { status?: ValidationStatus; proof?: string; attestationHash?: string; validatedAt?: Date }
  ): Promise<TaskValidation | null>;

  /**
   * List validations for an agent
   */
  listValidationsForAgent(agentId: string, options?: ListValidationsOptions): Promise<TaskValidation[]>;

  /**
   * Delete a validation
   */
  deleteValidation(validationId: string): Promise<boolean>;

  /**
   * Check if an agent exists (for validation)
   */
  agentExists(agentId: string): Promise<boolean>;
}

// ============================================
// Combined Storage Provider
// ============================================

/**
 * Combined storage provider interface
 * Provides all storage operations in a single interface
 */
export interface ARC8004StorageProvider {
  identity: IdentityStorageProvider;
  reputation: ReputationStorageProvider;
  validation: ValidationStorageProvider;
}

// ============================================
// Storage Type Enum
// ============================================

/**
 * Available storage types
 */
export type StorageType = 'memory' | 'database' | 'custom';

/**
 * Storage configuration
 */
export interface StorageConfig {
  /** Storage type to use */
  type: StorageType;
  
  /** 
   * Whether to skip agent existence checks
   * Useful for memory mode where agent table doesn't exist
   * @default false for database mode, true for memory mode
   */
  skipAgentValidation?: boolean;

  /**
   * Custom storage providers (required when type is 'custom')
   */
  customProviders?: Partial<ARC8004StorageProvider>;
}
