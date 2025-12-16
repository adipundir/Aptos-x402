/**
 * ARC-8004 On-Chain Module
 * 
 * Provides on-chain provider abstraction for blockchain operations
 * 
 * @packageDocumentation
 */

export type {
  OnChainProvider,
  MintIdentityResult,
  VerifyIdentityResult,
  AttestationResult,
  OnChainAgentScore,
} from './types';

export {
  NullOnChainProvider,
  AptosOnChainProvider,
  createOnChainProvider,
} from './types';
