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
 * @packageDocumentation
 */

// Types
export * from './types';

// Identity Registry
export { IdentityRegistry } from './identity/registry';
export { createAgentCard, validateAgentCard } from './identity/agent-card';

// Reputation Registry
export { ReputationRegistry } from './reputation/registry';
export { calculateTrustLevel, getTrustLevelLabel } from './reputation/scoring';

// Validation Registry
export { ValidationRegistry } from './validation/registry';

// Constants
export const ARC8004_VERSION = '1.0.0';
export const ARC8004_PROTOCOL = 'arc8004';













