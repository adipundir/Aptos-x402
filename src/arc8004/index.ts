/**
 * @x402/aptos - ARC-8004 Agent Trust Layer SDK
 * 
 * A production-ready SDK for implementing ARC-8004 (Aptos Agent Trust Layer Protocol).
 * Provides flexible storage options (memory/database) and optional on-chain integration.
 * 
 * @packageDocumentation
 * 
 * @example Quick Start
 * ```typescript
 * import { createARC8004Client } from '@x402/aptos/arc8004';
 * 
 * // Create client with defaults (memory storage, no on-chain)
 * const client = await createARC8004Client();
 * 
 * // Register an agent identity
 * const { identity } = await client.identity.register({
 *   agentId: 'my-agent',
 *   agentCard: {
 *     name: 'My Agent',
 *     description: 'A helpful AI agent',
 *     version: '1.0.0',
 *     capabilities: ['payment', 'data-fetch'],
 *     protocols: ['x402', 'http'],
 *     supportedNetworks: ['aptos-testnet'],
 *     owner: { address: '0x...', publicKey: '0x...' },
 *   },
 * });
 * 
 * // Submit feedback
 * await client.reputation.submitFeedback({
 *   agentId: 'my-agent',
 *   clientAddress: '0x...',
 *   overallScore: 5,
 *   paymentHash: '0x...',
 * });
 * 
 * // Get reputation
 * const reputation = await client.reputation.getReputation('my-agent');
 * console.log(`Trust Level: ${reputation?.trustLevel}`);
 * ```
 */

// Main client and factory
export {
  ARC8004Client,
  IdentityClient,
  ReputationClient,
  ValidationClient,
  createARC8004Client,
} from './client';

export type { ARC8004ClientOptions } from './client';

// Types re-exported for convenience
export {
  TrustLevel,
  type AgentCard,
  type AgentIdentity,
  type RegisterIdentityRequest,
  type RegisterIdentityResponse,
  type FeedbackSubmission,
  type FeedbackRecord,
  type AgentReputationScore,
  type TaskValidationRequest,
  type TaskValidation,
  type ValidationResult,
  type ARC8004Config,
  type ValidationType,
  type ValidationStatus,
  type StorageType,
} from '../../lib/arc8004/types';

// Configuration helpers
export {
  resolveARC8004Config,
  DEFAULT_ARC8004_CONFIG,
} from '../../lib/arc8004/types';

// Agent card utilities
export {
  createAgentCard,
  validateAgentCard,
} from '../../lib/arc8004/identity/agent-card';

// Scoring utilities
export {
  calculateTrustLevel,
  getTrustLevelLabel,
} from '../../lib/arc8004/reputation/scoring';

// Storage providers (for advanced use cases)
export type {
  IdentityStorageProvider,
  ReputationStorageProvider,
  ValidationStorageProvider,
  ARC8004StorageProvider,
  StorageConfig,
} from '../../lib/arc8004/storage/types';

export {
  createStorage,
  createInMemoryStorage,
} from '../../lib/arc8004/storage';

// On-chain providers (for advanced use cases)
export type {
  OnChainProvider,
  MintIdentityResult,
  VerifyIdentityResult,
  AttestationResult,
} from '../../lib/arc8004/chain/types';

export {
  NullOnChainProvider,
  AptosOnChainProvider,
  createOnChainProvider,
} from '../../lib/arc8004/chain';

// Version
export const ARC8004_VERSION = '2.0.0';
