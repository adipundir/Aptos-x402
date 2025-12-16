/**
 * ARC-8004 Storage Module
 * 
 * Provides flexible storage backends for ARC-8004 registries:
 * - In-memory storage for SDK/testing
 * - PostgreSQL storage for production
 * - Custom storage provider interface for advanced use cases
 * 
 * @packageDocumentation
 */

// Export types
export type {
  IdentityStorageProvider,
  ReputationStorageProvider,
  ValidationStorageProvider,
  ARC8004StorageProvider,
  StorageType,
  StorageConfig,
  ListIdentitiesOptions,
  ListFeedbackOptions,
  ListValidationsOptions,
} from './types';

// Export in-memory implementations
export {
  InMemoryIdentityStorage,
  InMemoryReputationStorage,
  InMemoryValidationStorage,
  createInMemoryStorage,
} from './memory';

// Export PostgreSQL implementations (lazy-loaded)
export {
  PostgresIdentityStorage,
  PostgresReputationStorage,
  PostgresValidationStorage,
  createPostgresStorage,
} from './postgres';

// ============================================
// Storage Factory
// ============================================

import type { ARC8004StorageProvider, StorageConfig } from './types';
import { createInMemoryStorage } from './memory';

/**
 * Create a storage provider based on configuration
 * 
 * @param config - Storage configuration
 * @returns Promise resolving to an ARC8004StorageProvider
 * 
 * @example Memory storage (default)
 * ```typescript
 * const storage = await createStorage({ type: 'memory' });
 * ```
 * 
 * @example Database storage
 * ```typescript
 * const storage = await createStorage({ type: 'database' });
 * ```
 * 
 * @example Custom storage
 * ```typescript
 * const storage = await createStorage({
 *   type: 'custom',
 *   customProviders: {
 *     identity: myCustomIdentityProvider,
 *     reputation: myCustomReputationProvider,
 *     validation: myCustomValidationProvider,
 *   },
 * });
 * ```
 */
export async function createStorage(config?: Partial<StorageConfig>): Promise<ARC8004StorageProvider> {
  const type = config?.type || 'memory';

  switch (type) {
    case 'memory':
      return createInMemoryStorage();

    case 'database': {
      // Lazy import to avoid crash when DATABASE_URL is not set
      const { createPostgresStorage } = await import('./postgres');
      return createPostgresStorage({
        skipAgentValidation: config?.skipAgentValidation,
      });
    }

    case 'custom': {
      if (!config?.customProviders) {
        throw new Error('Custom storage type requires customProviders to be specified');
      }

      const { identity, reputation, validation } = config.customProviders;

      if (!identity || !reputation || !validation) {
        // Fall back to memory for missing providers
        const memory = createInMemoryStorage();
        return {
          identity: identity || memory.identity,
          reputation: reputation || memory.reputation,
          validation: validation || memory.validation,
        };
      }

      return { identity, reputation, validation };
    }

    default:
      throw new Error(`Unknown storage type: ${type}`);
  }
}
