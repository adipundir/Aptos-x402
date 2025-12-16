/**
 * ARC-8004 Type Definitions
 * Aptos Agent Trust Layer Protocol Types
 */

/**
 * Agent Card - Off-chain metadata linked to on-chain identity
 * Similar to ERC-8004's Agent Card concept
 */
export interface AgentCard {
  /** Agent display name */
  name: string;
  /** Agent description */
  description: string;
  /** ARC-8004 version */
  version: string;
  /** Agent capabilities (e.g., "payment", "data-fetch", "llm-interaction") */
  capabilities: string[];
  /** Supported protocols (e.g., "x402", "http", "websocket") */
  protocols: string[];
  /** Supported blockchain networks */
  supportedNetworks: string[];
  /** Agent endpoints */
  endpoints?: {
    api?: string;
    webhook?: string;
  };
  /** Owner information */
  owner: {
    address: string;
    publicKey: string;
  };
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Agent Identity - On-chain identity representation
 */
export interface AgentIdentity {
  /** Unique identity ID */
  id: string;
  /** Associated agent ID */
  agentId: string;
  /** Wallet address */
  walletAddress: string;
  /** On-chain token address (NFT) */
  tokenAddress?: string;
  /** Token ID if minted */
  tokenId?: string;
  /** Mint transaction hash */
  mintTransactionHash?: string;
  /** Agent Card metadata */
  agentCard: AgentCard;
  /** Verification status */
  verified: boolean;
  /** Verification timestamp */
  verifiedAt?: Date;
  /** Verifier address/ID */
  verifiedBy?: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Identity registration request
 */
export interface RegisterIdentityRequest {
  agentId: string;
  agentCard: AgentCard;
  mintOnChain?: boolean;
}

/**
 * Identity registration response
 */
export interface RegisterIdentityResponse {
  identity: AgentIdentity;
  tokenAddress?: string;
  transactionHash?: string;
}

/**
 * Feedback submission
 */
export interface FeedbackSubmission {
  /** Agent ID receiving feedback */
  agentId: string;
  /** Client address submitting feedback */
  clientAddress: string;
  /** Job/task reference ID */
  jobId?: string;
  /** Overall score (1-5) */
  overallScore: number;
  /** Reliability score (1-5) */
  reliabilityScore?: number;
  /** Speed score (1-5) */
  speedScore?: number;
  /** Accuracy score (1-5) */
  accuracyScore?: number;
  /** Tags for categorization */
  tags?: string[];
  /** Optional comment */
  comment?: string;
  /** Related payment hash (x402 integration) */
  paymentHash?: string;
  /** Payment amount in octas */
  paymentAmount?: string;
}

/**
 * Feedback record
 */
export interface FeedbackRecord extends FeedbackSubmission {
  /** Feedback ID */
  id: string;
  /** On-chain attestation hash */
  attestationHash?: string;
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * Aggregated agent reputation
 */
export interface AgentReputationScore {
  /** Agent ID */
  agentId: string;
  /** Trust level (0-100) */
  trustLevel: number;
  /** Average overall score (1-5) */
  averageScore: number;
  /** Total feedback count */
  totalFeedback: number;
  /** Category scores */
  scores: {
    reliability: number;
    speed: number;
    accuracy: number;
  };
  /** Transaction metrics */
  transactions: {
    total: number;
    successful: number;
    successRate: number;
  };
  /** Latest on-chain attestation */
  latestAttestationHash?: string;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Trust level thresholds
 */
export enum TrustLevel {
  UNKNOWN = 0,
  LOW = 20,
  MODERATE = 40,
  GOOD = 60,
  HIGH = 80,
  EXCELLENT = 95,
}

/**
 * Validation types supported
 */
export type ValidationType = 'manual' | 'zkproof' | 'tee' | 'oracle';

/**
 * Validation status
 */
export type ValidationStatus = 'pending' | 'validated' | 'rejected';

/**
 * Task validation request
 */
export interface TaskValidationRequest {
  /** Task ID */
  taskId: string;
  /** Agent ID that performed the task */
  agentId: string;
  /** Validator ID */
  validatorId: string;
  /** Validator wallet address */
  validatorAddress?: string;
  /** Type of validation */
  validationType: ValidationType;
  /** Cryptographic proof (if applicable) */
  proof?: string;
  /** Related payment hash */
  paymentHash?: string;
}

/**
 * Task validation record
 */
export interface TaskValidation extends TaskValidationRequest {
  /** Validation ID */
  id: string;
  /** Current status */
  status: ValidationStatus;
  /** On-chain attestation hash */
  attestationHash?: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Validation timestamp */
  validatedAt?: Date;
}

/**
 * Validation result returned when verifying task for payment
 */
export interface ValidationResult {
  /** Task ID */
  taskId: string;
  /** Whether the task is valid */
  isValid: boolean;
  /** ID of the validator */
  validatorId: string;
  /** Timestamp of validation */
  timestamp: number;
  /** Optional proof data */
  proof?: string;
  /** Optional on-chain attestation hash */
  attestationHash?: string;
}

/**
 * Storage type for ARC-8004 data
 */
export type StorageType = 'memory' | 'database' | 'custom';

/**
 * ARC-8004 configuration
 * 
 * @example Minimal configuration (memory storage, no on-chain)
 * ```typescript
 * const config: ARC8004Config = {
 *   storageType: 'memory',
 *   onChainEnabled: false,
 * };
 * ```
 * 
 * @example Full production configuration
 * ```typescript
 * const config: ARC8004Config = {
 *   storageType: 'database',
 *   onChainEnabled: true,
 *   moduleAddress: '0x...',
 *   network: 'mainnet',
 * };
 * ```
 */
export interface ARC8004Config {
  // ============================================
  // Storage Configuration
  // ============================================
  
  /**
   * Storage type to use for ARC-8004 data
   * - 'memory': In-memory storage (lost on restart, good for SDK/testing)
   * - 'database': PostgreSQL via Drizzle ORM (requires DATABASE_URL)
   * - 'custom': User-provided storage providers
   * @default 'memory'
   */
  storageType: StorageType;

  /**
   * Whether to skip agent existence validation
   * Set to true when using memory storage without a full agent database
   * @default true for memory mode, false for database mode
   */
  skipAgentValidation?: boolean;

  // ============================================
  // On-Chain Configuration
  // ============================================

  /**
   * Enable on-chain operations (minting, attestations)
   * When false, all data is stored off-chain only
   * @default false
   */
  onChainEnabled: boolean;

  /**
   * Move module address for ARC-8004 contracts
   * Required when onChainEnabled is true
   */
  moduleAddress?: string;

  /**
   * Aptos network to use
   * @default 'aptos-testnet'
   */
  network?: string;

  // ============================================
  // Behavior Configuration
  // ============================================

  /**
   * Auto-register identity when agent is created
   * @default false
   */
  autoRegisterIdentity?: boolean;

  /**
   * Auto-update reputation after successful payments
   * @default true
   */
  autoUpdateReputation?: boolean;
}

/**
 * Legacy configuration type for backward compatibility
 * @deprecated Use ARC8004Config instead
 */
export interface LegacyARC8004Config {
  moduleAddress: string;
  network: string;
  onChainEnabled: boolean;
  autoRegisterIdentity: boolean;
  autoUpdateReputation: boolean;
}

/**
 * Default configuration from environment variables
 */
export const DEFAULT_ARC8004_CONFIG: ARC8004Config = {
  // Storage defaults to memory for SDK use (no database required)
  storageType: (process.env.ARC8004_STORAGE_TYPE as StorageType) || 'memory',
  skipAgentValidation: process.env.ARC8004_SKIP_AGENT_VALIDATION !== 'false',
  
  // On-chain defaults
  moduleAddress: process.env.ARC8004_MODULE_ADDRESS || undefined,
  network: process.env.APTOS_NETWORK || process.env.NEXT_PUBLIC_APTOS_NETWORK || 'aptos-testnet',
  onChainEnabled: process.env.ARC8004_ONCHAIN_ENABLED === 'true',
  
  // Behavior defaults
  autoRegisterIdentity: process.env.ARC8004_AUTO_REGISTER === 'true',
  autoUpdateReputation: process.env.ARC8004_AUTO_UPDATE_REPUTATION !== 'false',
};

/**
 * Resolve ARC-8004 configuration by merging partial config with defaults
 * 
 * @param config - Partial configuration to merge with defaults
 * @returns Complete ARC8004Config
 * 
 * @example
 * ```typescript
 * // Use defaults
 * const config = resolveARC8004Config();
 * 
 * // Override specific settings
 * const config = resolveARC8004Config({
 *   storageType: 'database',
 *   onChainEnabled: true,
 * });
 * ```
 */
export function resolveARC8004Config(config?: Partial<ARC8004Config>): ARC8004Config {
  const merged = {
    ...DEFAULT_ARC8004_CONFIG,
    ...config,
  };

  // Auto-set skipAgentValidation based on storage type if not explicitly set
  if (config?.skipAgentValidation === undefined) {
    merged.skipAgentValidation = merged.storageType === 'memory';
  }

  return merged;
}

/**
 * Convert legacy config to new format
 * @deprecated For backward compatibility only
 */
export function fromLegacyConfig(legacy: Partial<LegacyARC8004Config>): Partial<ARC8004Config> {
  return {
    storageType: 'database', // Legacy always used database
    moduleAddress: legacy.moduleAddress,
    network: legacy.network,
    onChainEnabled: legacy.onChainEnabled,
    autoRegisterIdentity: legacy.autoRegisterIdentity,
    autoUpdateReputation: legacy.autoUpdateReputation,
  };
}
