/**
 * Agent Card Utilities
 * Helpers for creating and validating Agent Cards
 */

import type { AgentCard } from '../types';

/**
 * ARC-8004 protocol version for Agent Cards
 */
export const AGENT_CARD_VERSION = '1.0.0';

/**
 * Default capabilities for agents
 */
export const DEFAULT_CAPABILITIES = ['payment', 'data-fetch'];

/**
 * Default protocols supported
 */
export const DEFAULT_PROTOCOLS = ['x402', 'http'];

/**
 * Default supported networks
 */
export const DEFAULT_NETWORKS = ['aptos-testnet'];

/**
 * Create a new Agent Card with defaults
 */
export function createAgentCard(params: {
  name: string;
  description: string;
  ownerAddress: string;
  ownerPublicKey: string;
  capabilities?: string[];
  protocols?: string[];
  supportedNetworks?: string[];
  endpoints?: {
    api?: string;
    webhook?: string;
  };
  metadata?: Record<string, unknown>;
}): AgentCard {
  return {
    name: params.name,
    description: params.description,
    version: AGENT_CARD_VERSION,
    capabilities: params.capabilities || DEFAULT_CAPABILITIES,
    protocols: params.protocols || DEFAULT_PROTOCOLS,
    supportedNetworks: params.supportedNetworks || DEFAULT_NETWORKS,
    endpoints: params.endpoints,
    owner: {
      address: params.ownerAddress,
      publicKey: params.ownerPublicKey,
    },
    metadata: params.metadata,
  };
}

/**
 * Validation errors for Agent Card
 */
export interface AgentCardValidationError {
  field: string;
  message: string;
}

/**
 * Validate an Agent Card
 */
export function validateAgentCard(agentCard: AgentCard): {
  valid: boolean;
  errors: AgentCardValidationError[];
} {
  const errors: AgentCardValidationError[] = [];

  // Required fields
  if (!agentCard.name || agentCard.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required' });
  }

  if (!agentCard.description || agentCard.description.trim().length === 0) {
    errors.push({ field: 'description', message: 'Description is required' });
  }

  if (!agentCard.version) {
    errors.push({ field: 'version', message: 'Version is required' });
  }

  // Owner validation
  if (!agentCard.owner) {
    errors.push({ field: 'owner', message: 'Owner information is required' });
  } else {
    if (!agentCard.owner.address) {
      errors.push({ field: 'owner.address', message: 'Owner address is required' });
    } else if (!isValidAptosAddress(agentCard.owner.address)) {
      errors.push({ field: 'owner.address', message: 'Invalid Aptos address format' });
    }

    if (!agentCard.owner.publicKey) {
      errors.push({ field: 'owner.publicKey', message: 'Owner public key is required' });
    }
  }

  // Capabilities validation
  if (!agentCard.capabilities || !Array.isArray(agentCard.capabilities)) {
    errors.push({ field: 'capabilities', message: 'Capabilities must be an array' });
  } else if (agentCard.capabilities.length === 0) {
    errors.push({ field: 'capabilities', message: 'At least one capability is required' });
  }

  // Protocols validation
  if (!agentCard.protocols || !Array.isArray(agentCard.protocols)) {
    errors.push({ field: 'protocols', message: 'Protocols must be an array' });
  } else if (agentCard.protocols.length === 0) {
    errors.push({ field: 'protocols', message: 'At least one protocol is required' });
  }

  // Networks validation
  if (!agentCard.supportedNetworks || !Array.isArray(agentCard.supportedNetworks)) {
    errors.push({ field: 'supportedNetworks', message: 'Supported networks must be an array' });
  } else if (agentCard.supportedNetworks.length === 0) {
    errors.push({ field: 'supportedNetworks', message: 'At least one network is required' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a string is a valid Aptos address
 */
function isValidAptosAddress(address: string): boolean {
  // Aptos addresses are 64 hex characters with optional 0x prefix
  const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;
  return /^[0-9a-fA-F]{1,64}$/.test(cleanAddress);
}

/**
 * Generate metadata URI for on-chain storage
 * Returns a hash-based URI for the agent card
 */
export function generateMetadataUri(agentCard: AgentCard): string {
  const data = JSON.stringify(agentCard);
  const hash = Buffer.from(data).toString('base64url');
  return `arc8004://${hash}`;
}

/**
 * Parse metadata URI to extract agent card
 */
export function parseMetadataUri(uri: string): AgentCard | null {
  if (!uri.startsWith('arc8004://')) {
    return null;
  }
  
  try {
    const hash = uri.slice('arc8004://'.length);
    const data = Buffer.from(hash, 'base64url').toString();
    return JSON.parse(data) as AgentCard;
  } catch {
    return null;
  }
}

/**
 * Merge agent card updates with existing card
 */
export function updateAgentCard(
  existing: AgentCard,
  updates: Partial<Omit<AgentCard, 'owner' | 'version'>>
): AgentCard {
  return {
    ...existing,
    ...updates,
    // Preserve owner and version
    owner: existing.owner,
    version: existing.version,
  };
}

