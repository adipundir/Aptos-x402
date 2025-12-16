/**
 * ARC-8004 In-Memory Storage Providers
 * 
 * Lightweight storage implementations that keep data in memory.
 * Ideal for:
 * - SDK consumers who don't want database setup
 * - Testing and development
 * - Stateless verification with on-chain fallback
 * 
 * Note: Data is lost when the process exits.
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
import { calculateTrustLevel, calculateSuccessRate, calculateAverage } from '../reputation/scoring';
import type {
  IdentityStorageProvider,
  ReputationStorageProvider,
  ValidationStorageProvider,
  ListIdentitiesOptions,
  ListFeedbackOptions,
  ListValidationsOptions,
  ARC8004StorageProvider,
} from './types';

// ============================================
// ID Generation Utilities
// ============================================

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// In-Memory Identity Storage
// ============================================

/**
 * In-memory implementation of identity storage
 * Stores all identities in a Map, keyed by agentId
 */
export class InMemoryIdentityStorage implements IdentityStorageProvider {
  private identities = new Map<string, AgentIdentity>();
  private byAddress = new Map<string, string>(); // address -> agentId
  private byTokenAddress = new Map<string, string>(); // tokenAddress -> agentId
  private knownAgents = new Set<string>(); // Track "registered" agents

  /**
   * Register an agent ID as known (for validation purposes)
   */
  registerAgent(agentId: string): void {
    this.knownAgents.add(agentId);
  }

  /**
   * Register multiple agent IDs
   */
  registerAgents(agentIds: string[]): void {
    agentIds.forEach(id => this.knownAgents.add(id));
  }

  async createIdentity(identity: Omit<AgentIdentity, 'id' | 'createdAt' | 'updatedAt'>): Promise<AgentIdentity> {
    const now = new Date();
    const id = generateId('identity');
    
    const fullIdentity: AgentIdentity = {
      ...identity,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.identities.set(identity.agentId, fullIdentity);
    this.byAddress.set(identity.walletAddress.toLowerCase(), identity.agentId);
    
    if (identity.tokenAddress) {
      this.byTokenAddress.set(identity.tokenAddress.toLowerCase(), identity.agentId);
    }

    // Auto-register agent as known
    this.knownAgents.add(identity.agentId);

    return fullIdentity;
  }

  async getIdentity(agentId: string): Promise<AgentIdentity | null> {
    return this.identities.get(agentId) || null;
  }

  async getIdentityByAddress(address: string): Promise<AgentIdentity | null> {
    const agentId = this.byAddress.get(address.toLowerCase());
    if (!agentId) return null;
    return this.identities.get(agentId) || null;
  }

  async getIdentityByTokenAddress(tokenAddress: string): Promise<AgentIdentity | null> {
    const agentId = this.byTokenAddress.get(tokenAddress.toLowerCase());
    if (!agentId) return null;
    return this.identities.get(agentId) || null;
  }

  async updateIdentity(agentId: string, updates: Partial<AgentIdentity>): Promise<AgentIdentity | null> {
    const existing = this.identities.get(agentId);
    if (!existing) return null;

    const updated: AgentIdentity = {
      ...existing,
      ...updates,
      id: existing.id, // Prevent ID change
      agentId: existing.agentId, // Prevent agentId change
      createdAt: existing.createdAt, // Preserve creation time
      updatedAt: new Date(),
    };

    this.identities.set(agentId, updated);

    // Update indexes if needed
    if (updates.walletAddress && updates.walletAddress !== existing.walletAddress) {
      this.byAddress.delete(existing.walletAddress.toLowerCase());
      this.byAddress.set(updates.walletAddress.toLowerCase(), agentId);
    }

    if (updates.tokenAddress && updates.tokenAddress !== existing.tokenAddress) {
      if (existing.tokenAddress) {
        this.byTokenAddress.delete(existing.tokenAddress.toLowerCase());
      }
      this.byTokenAddress.set(updates.tokenAddress.toLowerCase(), agentId);
    }

    return updated;
  }

  async deleteIdentity(agentId: string): Promise<boolean> {
    const existing = this.identities.get(agentId);
    if (!existing) return false;

    this.identities.delete(agentId);
    this.byAddress.delete(existing.walletAddress.toLowerCase());
    
    if (existing.tokenAddress) {
      this.byTokenAddress.delete(existing.tokenAddress.toLowerCase());
    }

    return true;
  }

  async listIdentities(options?: ListIdentitiesOptions): Promise<AgentIdentity[]> {
    let results = Array.from(this.identities.values());

    // Filter by verification status
    if (options?.verified !== undefined) {
      results = results.filter(i => i.verified === options.verified);
    }

    // Sort by creation date (newest first)
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    return results.slice(offset, offset + limit);
  }

  async agentExists(agentId: string): Promise<boolean> {
    // In memory mode, we're lenient - either the agent is known or we allow it
    return this.knownAgents.has(agentId) || this.identities.has(agentId);
  }

  async identityExists(agentId: string): Promise<boolean> {
    return this.identities.has(agentId);
  }

  /**
   * Clear all stored data (useful for testing)
   */
  clear(): void {
    this.identities.clear();
    this.byAddress.clear();
    this.byTokenAddress.clear();
    this.knownAgents.clear();
  }
}

// ============================================
// In-Memory Reputation Storage
// ============================================

/**
 * In-memory implementation of reputation storage
 */
export class InMemoryReputationStorage implements ReputationStorageProvider {
  private reputations = new Map<string, AgentReputationScore>();
  private feedback = new Map<string, FeedbackRecord[]>(); // agentId -> feedback records
  private feedbackById = new Map<string, FeedbackRecord>(); // feedbackId -> record
  private knownAgents = new Set<string>();

  /**
   * Register an agent ID as known
   */
  registerAgent(agentId: string): void {
    this.knownAgents.add(agentId);
  }

  async createFeedback(submission: FeedbackSubmission): Promise<FeedbackRecord> {
    const id = generateId('feedback');
    const now = new Date();

    const record: FeedbackRecord = {
      ...submission,
      id,
      createdAt: now,
    };

    // Store feedback
    this.feedbackById.set(id, record);
    
    const agentFeedback = this.feedback.get(submission.agentId) || [];
    agentFeedback.push(record);
    this.feedback.set(submission.agentId, agentFeedback);

    // Auto-register agent
    this.knownAgents.add(submission.agentId);

    // Auto-update aggregated reputation
    await this.recalculateReputation(submission.agentId);

    return record;
  }

  async updateFeedbackAttestation(feedbackId: string, attestationHash: string): Promise<void> {
    const record = this.feedbackById.get(feedbackId);
    if (record) {
      record.attestationHash = attestationHash;
    }
  }

  async getReputation(agentId: string): Promise<AgentReputationScore | null> {
    return this.reputations.get(agentId) || null;
  }

  async getFeedbackHistory(agentId: string, options?: ListFeedbackOptions): Promise<FeedbackRecord[]> {
    const records = this.feedback.get(agentId) || [];
    
    // Sort by date (newest first)
    const sorted = [...records].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    return sorted.slice(offset, offset + limit);
  }

  async upsertReputation(agentId: string, reputation: Partial<AgentReputationScore>): Promise<void> {
    const existing = this.reputations.get(agentId);
    const now = new Date();

    if (existing) {
      this.reputations.set(agentId, {
        ...existing,
        ...reputation,
        agentId, // Ensure agentId is preserved
        updatedAt: now,
      });
    } else {
      this.reputations.set(agentId, {
        agentId,
        trustLevel: 0,
        averageScore: 0,
        totalFeedback: 0,
        scores: { reliability: 0, speed: 0, accuracy: 0 },
        transactions: { total: 0, successful: 0, successRate: 0 },
        updatedAt: now,
        ...reputation,
      });
    }

    this.knownAgents.add(agentId);
  }

  async recordTransaction(agentId: string, successful: boolean): Promise<void> {
    const existing = this.reputations.get(agentId);
    const now = new Date();

    if (existing) {
      const newTotal = existing.transactions.total + 1;
      const newSuccessful = successful ? existing.transactions.successful + 1 : existing.transactions.successful;
      const newSuccessRate = calculateSuccessRate(newTotal, newSuccessful);

      this.reputations.set(agentId, {
        ...existing,
        transactions: {
          total: newTotal,
          successful: newSuccessful,
          successRate: newSuccessRate,
        },
        updatedAt: now,
      });
    } else {
      // Create initial reputation
      this.reputations.set(agentId, {
        agentId,
        trustLevel: 0,
        averageScore: 0,
        totalFeedback: 0,
        scores: { reliability: 0, speed: 0, accuracy: 0 },
        transactions: {
          total: 1,
          successful: successful ? 1 : 0,
          successRate: successful ? 100 : 0,
        },
        updatedAt: now,
      });
    }

    this.knownAgents.add(agentId);
  }

  async updateAttestationHash(agentId: string, attestationHash: string): Promise<void> {
    const existing = this.reputations.get(agentId);
    if (existing) {
      existing.latestAttestationHash = attestationHash;
      existing.updatedAt = new Date();
    }
  }

  async deleteReputation(agentId: string): Promise<boolean> {
    const hadReputation = this.reputations.has(agentId);
    const hadFeedback = this.feedback.has(agentId);

    // Delete feedback records from feedbackById map
    const records = this.feedback.get(agentId) || [];
    records.forEach(r => this.feedbackById.delete(r.id));

    this.reputations.delete(agentId);
    this.feedback.delete(agentId);

    return hadReputation || hadFeedback;
  }

  async agentExists(agentId: string): Promise<boolean> {
    return this.knownAgents.has(agentId) || this.reputations.has(agentId);
  }

  /**
   * Recalculate aggregated reputation from feedback
   */
  private async recalculateReputation(agentId: string): Promise<void> {
    const records = this.feedback.get(agentId) || [];
    const existing = this.reputations.get(agentId);

    if (records.length === 0) return;

    const overallScores = records.map(r => r.overallScore);
    const reliabilityScores = records.filter(r => r.reliabilityScore).map(r => r.reliabilityScore!);
    const speedScores = records.filter(r => r.speedScore).map(r => r.speedScore!);
    const accuracyScores = records.filter(r => r.accuracyScore).map(r => r.accuracyScore!);

    const avgOverall = calculateAverage(overallScores);
    const avgReliability = calculateAverage(reliabilityScores);
    const avgSpeed = calculateAverage(speedScores);
    const avgAccuracy = calculateAverage(accuracyScores);

    const transactions = existing?.transactions || { total: 0, successful: 0, successRate: 0 };
    const trustLevel = calculateTrustLevel({
      averageScore: avgOverall,
      feedbackCount: records.length,
      successRate: transactions.successRate / 100, // Convert from percentage to 0-1
      reliabilityScore: avgReliability,
      speedScore: avgSpeed,
      accuracyScore: avgAccuracy,
    });

    await this.upsertReputation(agentId, {
      trustLevel,
      averageScore: avgOverall,
      totalFeedback: records.length,
      scores: {
        reliability: avgReliability,
        speed: avgSpeed,
        accuracy: avgAccuracy,
      },
      transactions,
    });
  }

  /**
   * Clear all stored data
   */
  clear(): void {
    this.reputations.clear();
    this.feedback.clear();
    this.feedbackById.clear();
    this.knownAgents.clear();
  }
}

// ============================================
// In-Memory Validation Storage
// ============================================

/**
 * In-memory implementation of validation storage
 */
export class InMemoryValidationStorage implements ValidationStorageProvider {
  private validations = new Map<string, TaskValidation>();
  private byTaskId = new Map<string, string>(); // taskId -> validationId
  private byTaskAndValidator = new Map<string, string>(); // `${taskId}:${validatorId}` -> validationId
  private byAgentId = new Map<string, string[]>(); // agentId -> validationIds
  private knownAgents = new Set<string>();

  /**
   * Register an agent ID as known
   */
  registerAgent(agentId: string): void {
    this.knownAgents.add(agentId);
  }

  async createValidation(request: TaskValidationRequest): Promise<TaskValidation> {
    const id = generateId('val');
    const now = new Date();

    const validation: TaskValidation = {
      ...request,
      id,
      status: 'pending',
      createdAt: now,
    };

    this.validations.set(id, validation);
    this.byTaskId.set(request.taskId, id);
    this.byTaskAndValidator.set(`${request.taskId}:${request.validatorId}`, id);

    // Index by agent
    const agentValidations = this.byAgentId.get(request.agentId) || [];
    agentValidations.push(id);
    this.byAgentId.set(request.agentId, agentValidations);

    this.knownAgents.add(request.agentId);

    return validation;
  }

  async getValidation(validationId: string): Promise<TaskValidation | null> {
    return this.validations.get(validationId) || null;
  }

  async getValidationByTaskId(taskId: string): Promise<TaskValidation | null> {
    const validationId = this.byTaskId.get(taskId);
    if (!validationId) return null;
    return this.validations.get(validationId) || null;
  }

  async getValidationByTaskAndValidator(taskId: string, validatorId: string): Promise<TaskValidation | null> {
    const key = `${taskId}:${validatorId}`;
    const validationId = this.byTaskAndValidator.get(key);
    if (!validationId) return null;
    return this.validations.get(validationId) || null;
  }

  async updateValidation(
    validationId: string,
    updates: { status?: ValidationStatus; proof?: string; attestationHash?: string; validatedAt?: Date }
  ): Promise<TaskValidation | null> {
    const existing = this.validations.get(validationId);
    if (!existing) return null;

    const updated: TaskValidation = {
      ...existing,
      ...updates,
    };

    this.validations.set(validationId, updated);
    return updated;
  }

  async listValidationsForAgent(agentId: string, options?: ListValidationsOptions): Promise<TaskValidation[]> {
    const validationIds = this.byAgentId.get(agentId) || [];
    let results = validationIds
      .map(id => this.validations.get(id))
      .filter((v): v is TaskValidation => v !== undefined);

    // Filter by status
    if (options?.status) {
      results = results.filter(v => v.status === options.status);
    }

    // Sort by creation date (newest first)
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    return results.slice(offset, offset + limit);
  }

  async deleteValidation(validationId: string): Promise<boolean> {
    const existing = this.validations.get(validationId);
    if (!existing) return false;

    this.validations.delete(validationId);
    this.byTaskId.delete(existing.taskId);
    this.byTaskAndValidator.delete(`${existing.taskId}:${existing.validatorId}`);

    // Remove from agent index
    const agentValidations = this.byAgentId.get(existing.agentId) || [];
    const filtered = agentValidations.filter(id => id !== validationId);
    if (filtered.length > 0) {
      this.byAgentId.set(existing.agentId, filtered);
    } else {
      this.byAgentId.delete(existing.agentId);
    }

    return true;
  }

  async agentExists(agentId: string): Promise<boolean> {
    return this.knownAgents.has(agentId) || this.byAgentId.has(agentId);
  }

  /**
   * Clear all stored data
   */
  clear(): void {
    this.validations.clear();
    this.byTaskId.clear();
    this.byTaskAndValidator.clear();
    this.byAgentId.clear();
    this.knownAgents.clear();
  }
}

// ============================================
// Combined In-Memory Storage
// ============================================

/**
 * Creates a complete in-memory storage provider
 */
export function createInMemoryStorage(): ARC8004StorageProvider & { clear: () => void } {
  const identity = new InMemoryIdentityStorage();
  const reputation = new InMemoryReputationStorage();
  const validation = new InMemoryValidationStorage();

  return {
    identity,
    reputation,
    validation,
    clear: () => {
      identity.clear();
      reputation.clear();
      validation.clear();
    },
  };
}
