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
 * ARC-8004 configuration
 */
export interface ARC8004Config {
  /** Move module address */
  moduleAddress: string;
  /** Network (testnet/mainnet) */
  network: string;
  /** Enable on-chain operations */
  onChainEnabled: boolean;
  /** Auto-register identity on agent creation */
  autoRegisterIdentity: boolean;
  /** Auto-update reputation on payment */
  autoUpdateReputation: boolean;
}

/**
 * Default configuration from environment variables
 */
export const DEFAULT_ARC8004_CONFIG: ARC8004Config = {
  moduleAddress: process.env.ARC8004_MODULE_ADDRESS || '',
  network: process.env.APTOS_NETWORK || process.env.NEXT_PUBLIC_APTOS_NETWORK || 'aptos-testnet',
  onChainEnabled: process.env.ARC8004_ONCHAIN_ENABLED === 'true',
  autoRegisterIdentity: process.env.ARC8004_AUTO_REGISTER === 'true',
  autoUpdateReputation: true,
};

/**
 * Resolve ARC-8004 configuration by merging partial config with defaults
 */
export function resolveARC8004Config(config?: Partial<ARC8004Config>): ARC8004Config {
  return {
    ...DEFAULT_ARC8004_CONFIG,
    ...config,
  };
}
