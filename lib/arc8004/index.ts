/**
 * ARC-8004: Aptos Agent Trust Layer Protocol
 * 
 * An Aptos-native implementation inspired by ERC-8004, providing:
 * - Identity Registry: NFT-based agent identities with Agent Cards
 * - Reputation Registry: On-chain attestations and trust scoring
 * - Validation Registry: Task validation with cryptographic proofs
 * 
 * Integrated with x402 payment protocol for trusted agent transactions.
 * 
 * ## Storage Options
 * 
 * ARC-8004 v2.0 supports flexible storage:
 * - **memory**: In-memory storage (default, no database required)
 * - **database**: PostgreSQL via Drizzle ORM
 * - **custom**: User-provided storage providers
 * 
 * ## Usage
 * 
 * ### SDK Usage (recommended for package consumers)
 * ```typescript
 * import { createARC8004Client } from '@x402/aptos/arc8004';
 * 
 * const client = await createARC8004Client();
 * const { identity } = await client.identity.register({...});
 * ```
 * 
 * ### Direct Registry Usage (for server-side with database)
 * ```typescript
 * import { IdentityRegistry, ReputationRegistry } from '@/lib/arc8004';
 * 
 * const identityRegistry = new IdentityRegistry({ storageType: 'database' });
 * ```
 * 
 * @packageDocumentation
 */

// Types
export * from './types';

// Agent Card utilities (no database dependency)
export { createAgentCard, validateAgentCard } from './identity/agent-card';

// Scoring utilities (no database dependency)
export { calculateTrustLevel, getTrustLevelLabel } from './reputation/scoring';

// Legacy Registries (IdentityRegistry, ReputationRegistry, ValidationRegistry) are NOT exported
// They use @/lib/db which is project-specific and not bundled in npm
// For npm consumers: use the SDK client (createARC8004Client) with memory or custom storage

// Storage Providers (v2.0)
export {
  createStorage,
  createInMemoryStorage,
} from './storage';

export type {
  IdentityStorageProvider,
  ReputationStorageProvider,
  ValidationStorageProvider,
  ARC8004StorageProvider,
  StorageConfig,
} from './storage/types';

// On-Chain Providers (v2.0)
export {
  createOnChainProvider,
  NullOnChainProvider,
  AptosOnChainProvider,
} from './chain';

export type {
  OnChainProvider,
  MintIdentityResult,
  VerifyIdentityResult,
  AttestationResult,
} from './chain/types';

// Constants
export const ARC8004_VERSION = '2.0.0';
export const ARC8004_PROTOCOL = 'arc8004';
















