/**
 * ARC-8004 PostgreSQL Storage Providers
 * 
 * Database-backed storage implementations using Drizzle ORM.
 * Provides full persistence and is suitable for production deployments.
 * 
 * Requires:
 * - DATABASE_URL environment variable
 * - Database migrations run (drizzle/0007_arc8004_tables.sql)
 * 
 * @packageDocumentation
 */

import { eq, desc, and } from 'drizzle-orm';
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

// Import database lazily to avoid crash when DATABASE_URL is not set
type DrizzleDB = typeof import('@/lib/db').db;
type Schema = typeof import('@/lib/db/schema');

// ============================================
// ID Generation Utilities
// ============================================

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// PostgreSQL Identity Storage
// ============================================

/**
 * PostgreSQL implementation of identity storage
 */
export class PostgresIdentityStorage implements IdentityStorageProvider {
  constructor(
    private db: DrizzleDB,
    private schema: Schema,
    private skipAgentValidation = false
  ) {}

  async createIdentity(identity: Omit<AgentIdentity, 'id' | 'createdAt' | 'updatedAt'>): Promise<AgentIdentity> {
    const { agentIdentities } = this.schema;
    const now = new Date();
    const id = generateId('identity');

    const [created] = await this.db.insert(agentIdentities).values({
      id,
      agentId: identity.agentId,
      tokenAddress: identity.tokenAddress,
      tokenId: identity.tokenId,
      mintTransactionHash: identity.mintTransactionHash,
      agentCard: identity.agentCard,
      verified: identity.verified,
      verifiedAt: identity.verifiedAt,
      verifiedBy: identity.verifiedBy,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return {
      id: created.id,
      agentId: created.agentId,
      walletAddress: identity.agentCard.owner.address,
      tokenAddress: created.tokenAddress || undefined,
      tokenId: created.tokenId || undefined,
      mintTransactionHash: created.mintTransactionHash || undefined,
      agentCard: created.agentCard as AgentCard,
      verified: created.verified || false,
      verifiedAt: created.verifiedAt || undefined,
      verifiedBy: created.verifiedBy || undefined,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  async getIdentity(agentId: string): Promise<AgentIdentity | null> {
    const { agentIdentities } = this.schema;

    const result = await this.db
      .select()
      .from(agentIdentities)
      .where(eq(agentIdentities.agentId, agentId))
      .limit(1);

    if (result.length === 0) return null;

    const record = result[0];
    const agentCard = record.agentCard as AgentCard;

    return {
      id: record.id,
      agentId: record.agentId,
      walletAddress: agentCard.owner.address,
      tokenAddress: record.tokenAddress || undefined,
      tokenId: record.tokenId || undefined,
      mintTransactionHash: record.mintTransactionHash || undefined,
      agentCard,
      verified: record.verified || false,
      verifiedAt: record.verifiedAt || undefined,
      verifiedBy: record.verifiedBy || undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async getIdentityByAddress(address: string): Promise<AgentIdentity | null> {
    const { agentIdentities } = this.schema;

    // We need to search through all identities since wallet address is in JSONB
    // This is less efficient but allows flexible schema
    const results = await this.db.select().from(agentIdentities);

    for (const record of results) {
      const agentCard = record.agentCard as AgentCard;
      if (agentCard.owner.address.toLowerCase() === address.toLowerCase()) {
        return {
          id: record.id,
          agentId: record.agentId,
          walletAddress: agentCard.owner.address,
          tokenAddress: record.tokenAddress || undefined,
          tokenId: record.tokenId || undefined,
          mintTransactionHash: record.mintTransactionHash || undefined,
          agentCard,
          verified: record.verified || false,
          verifiedAt: record.verifiedAt || undefined,
          verifiedBy: record.verifiedBy || undefined,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        };
      }
    }

    return null;
  }

  async getIdentityByTokenAddress(tokenAddress: string): Promise<AgentIdentity | null> {
    const { agentIdentities } = this.schema;

    const result = await this.db
      .select()
      .from(agentIdentities)
      .where(eq(agentIdentities.tokenAddress, tokenAddress))
      .limit(1);

    if (result.length === 0) return null;

    const record = result[0];
    const agentCard = record.agentCard as AgentCard;

    return {
      id: record.id,
      agentId: record.agentId,
      walletAddress: agentCard.owner.address,
      tokenAddress: record.tokenAddress || undefined,
      tokenId: record.tokenId || undefined,
      mintTransactionHash: record.mintTransactionHash || undefined,
      agentCard,
      verified: record.verified || false,
      verifiedAt: record.verifiedAt || undefined,
      verifiedBy: record.verifiedBy || undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async updateIdentity(agentId: string, updates: Partial<AgentIdentity>): Promise<AgentIdentity | null> {
    const { agentIdentities } = this.schema;

    // Build update object, only including defined fields
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    
    if (updates.tokenAddress !== undefined) updateData.tokenAddress = updates.tokenAddress;
    if (updates.tokenId !== undefined) updateData.tokenId = updates.tokenId;
    if (updates.mintTransactionHash !== undefined) updateData.mintTransactionHash = updates.mintTransactionHash;
    if (updates.agentCard !== undefined) updateData.agentCard = updates.agentCard;
    if (updates.verified !== undefined) updateData.verified = updates.verified;
    if (updates.verifiedAt !== undefined) updateData.verifiedAt = updates.verifiedAt;
    if (updates.verifiedBy !== undefined) updateData.verifiedBy = updates.verifiedBy;

    const [updated] = await this.db
      .update(agentIdentities)
      .set(updateData)
      .where(eq(agentIdentities.agentId, agentId))
      .returning();

    if (!updated) return null;

    const agentCard = updated.agentCard as AgentCard;

    return {
      id: updated.id,
      agentId: updated.agentId,
      walletAddress: agentCard.owner.address,
      tokenAddress: updated.tokenAddress || undefined,
      tokenId: updated.tokenId || undefined,
      mintTransactionHash: updated.mintTransactionHash || undefined,
      agentCard,
      verified: updated.verified || false,
      verifiedAt: updated.verifiedAt || undefined,
      verifiedBy: updated.verifiedBy || undefined,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteIdentity(agentId: string): Promise<boolean> {
    const { agentIdentities } = this.schema;

    const result = await this.db
      .delete(agentIdentities)
      .where(eq(agentIdentities.agentId, agentId))
      .returning();

    return result.length > 0;
  }

  async listIdentities(options?: ListIdentitiesOptions): Promise<AgentIdentity[]> {
    const { agentIdentities } = this.schema;

    let query = this.db.select().from(agentIdentities);

    if (options?.verified !== undefined) {
      query = query.where(eq(agentIdentities.verified, options.verified)) as typeof query;
    }

    const results = await query
      .orderBy(desc(agentIdentities.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return results.map(record => {
      const agentCard = record.agentCard as AgentCard;
      return {
        id: record.id,
        agentId: record.agentId,
        walletAddress: agentCard.owner.address,
        tokenAddress: record.tokenAddress || undefined,
        tokenId: record.tokenId || undefined,
        mintTransactionHash: record.mintTransactionHash || undefined,
        agentCard,
        verified: record.verified || false,
        verifiedAt: record.verifiedAt || undefined,
        verifiedBy: record.verifiedBy || undefined,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
    });
  }

  async agentExists(agentId: string): Promise<boolean> {
    if (this.skipAgentValidation) return true;

    const { agents } = this.schema;

    const result = await this.db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);

    return result.length > 0;
  }

  async identityExists(agentId: string): Promise<boolean> {
    const { agentIdentities } = this.schema;

    const result = await this.db
      .select()
      .from(agentIdentities)
      .where(eq(agentIdentities.agentId, agentId))
      .limit(1);

    return result.length > 0;
  }
}

// ============================================
// PostgreSQL Reputation Storage
// ============================================

/**
 * PostgreSQL implementation of reputation storage
 */
export class PostgresReputationStorage implements ReputationStorageProvider {
  constructor(
    private db: DrizzleDB,
    private schema: Schema,
    private skipAgentValidation = false
  ) {}

  async createFeedback(submission: FeedbackSubmission): Promise<FeedbackRecord> {
    const { reputationFeedback } = this.schema;
    const id = generateId('feedback');
    const now = new Date();

    await this.db.insert(reputationFeedback).values({
      id,
      agentId: submission.agentId,
      clientAddress: submission.clientAddress,
      jobId: submission.jobId,
      overallScore: submission.overallScore,
      reliabilityScore: submission.reliabilityScore,
      speedScore: submission.speedScore,
      accuracyScore: submission.accuracyScore,
      tags: submission.tags || [],
      comment: submission.comment,
      paymentHash: submission.paymentHash,
      paymentAmount: submission.paymentAmount,
      createdAt: now,
    });

    return {
      ...submission,
      id,
      createdAt: now,
    };
  }

  async updateFeedbackAttestation(feedbackId: string, attestationHash: string): Promise<void> {
    const { reputationFeedback } = this.schema;

    await this.db
      .update(reputationFeedback)
      .set({ attestationHash })
      .where(eq(reputationFeedback.id, feedbackId));
  }

  async getReputation(agentId: string): Promise<AgentReputationScore | null> {
    const { agentReputations } = this.schema;

    const result = await this.db
      .select()
      .from(agentReputations)
      .where(eq(agentReputations.agentId, agentId))
      .limit(1);

    if (result.length === 0) return null;

    const rep = result[0];
    const successRate = calculateSuccessRate(
      rep.totalTransactions || 0,
      rep.successfulTransactions || 0
    );

    return {
      agentId: rep.agentId,
      trustLevel: rep.trustLevel || 0,
      averageScore: rep.averageScore || 0,
      totalFeedback: rep.totalFeedbackCount || 0,
      scores: {
        reliability: rep.reliabilityScore || 0,
        speed: rep.speedScore || 0,
        accuracy: rep.accuracyScore || 0,
      },
      transactions: {
        total: rep.totalTransactions || 0,
        successful: rep.successfulTransactions || 0,
        successRate,
      },
      latestAttestationHash: rep.latestAttestationHash || undefined,
      updatedAt: rep.updatedAt,
    };
  }

  async getFeedbackHistory(agentId: string, options?: ListFeedbackOptions): Promise<FeedbackRecord[]> {
    const { reputationFeedback } = this.schema;

    const results = await this.db
      .select()
      .from(reputationFeedback)
      .where(eq(reputationFeedback.agentId, agentId))
      .orderBy(desc(reputationFeedback.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return results.map(record => ({
      id: record.id,
      agentId: record.agentId,
      clientAddress: record.clientAddress,
      jobId: record.jobId || undefined,
      overallScore: record.overallScore,
      reliabilityScore: record.reliabilityScore || undefined,
      speedScore: record.speedScore || undefined,
      accuracyScore: record.accuracyScore || undefined,
      tags: (record.tags as string[]) || [],
      comment: record.comment || undefined,
      paymentHash: record.paymentHash || undefined,
      paymentAmount: record.paymentAmount || undefined,
      attestationHash: record.attestationHash || undefined,
      createdAt: record.createdAt,
    }));
  }

  async upsertReputation(agentId: string, reputation: Partial<AgentReputationScore>): Promise<void> {
    const { agentReputations } = this.schema;
    const now = new Date();

    // Try to update first
    const existing = await this.db
      .select()
      .from(agentReputations)
      .where(eq(agentReputations.agentId, agentId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      const updateData: Record<string, unknown> = { updatedAt: now };
      
      if (reputation.trustLevel !== undefined) updateData.trustLevel = reputation.trustLevel;
      if (reputation.averageScore !== undefined) updateData.averageScore = reputation.averageScore;
      if (reputation.totalFeedback !== undefined) updateData.totalFeedbackCount = reputation.totalFeedback;
      if (reputation.scores?.reliability !== undefined) updateData.reliabilityScore = reputation.scores.reliability;
      if (reputation.scores?.speed !== undefined) updateData.speedScore = reputation.scores.speed;
      if (reputation.scores?.accuracy !== undefined) updateData.accuracyScore = reputation.scores.accuracy;
      if (reputation.transactions?.total !== undefined) updateData.totalTransactions = reputation.transactions.total;
      if (reputation.transactions?.successful !== undefined) updateData.successfulTransactions = reputation.transactions.successful;
      if (reputation.latestAttestationHash !== undefined) updateData.latestAttestationHash = reputation.latestAttestationHash;

      await this.db
        .update(agentReputations)
        .set(updateData)
        .where(eq(agentReputations.agentId, agentId));
    } else {
      // Insert new
      const id = `rep_${agentId}`;
      await this.db.insert(agentReputations).values({
        id,
        agentId,
        trustLevel: reputation.trustLevel || 0,
        averageScore: reputation.averageScore || 0,
        totalFeedbackCount: reputation.totalFeedback || 0,
        reliabilityScore: reputation.scores?.reliability || 0,
        speedScore: reputation.scores?.speed || 0,
        accuracyScore: reputation.scores?.accuracy || 0,
        totalTransactions: reputation.transactions?.total || 0,
        successfulTransactions: reputation.transactions?.successful || 0,
        latestAttestationHash: reputation.latestAttestationHash,
        updatedAt: now,
      });
    }
  }

  async recordTransaction(agentId: string, successful: boolean): Promise<void> {
    const { agentReputations } = this.schema;

    const existing = await this.db
      .select()
      .from(agentReputations)
      .where(eq(agentReputations.agentId, agentId))
      .limit(1);

    const now = new Date();

    if (existing.length > 0) {
      const rep = existing[0];
      const newTotal = (rep.totalTransactions || 0) + 1;
      const newSuccessful = successful ? (rep.successfulTransactions || 0) + 1 : (rep.successfulTransactions || 0);

      await this.db
        .update(agentReputations)
        .set({
          totalTransactions: newTotal,
          successfulTransactions: newSuccessful,
          updatedAt: now,
        })
        .where(eq(agentReputations.agentId, agentId));
    } else {
      const id = `rep_${agentId}`;
      await this.db.insert(agentReputations).values({
        id,
        agentId,
        totalTransactions: 1,
        successfulTransactions: successful ? 1 : 0,
        updatedAt: now,
      });
    }
  }

  async updateAttestationHash(agentId: string, attestationHash: string): Promise<void> {
    const { agentReputations } = this.schema;

    await this.db
      .update(agentReputations)
      .set({ latestAttestationHash: attestationHash, updatedAt: new Date() })
      .where(eq(agentReputations.agentId, agentId));
  }

  async deleteReputation(agentId: string): Promise<boolean> {
    const { agentReputations, reputationFeedback } = this.schema;

    // Delete feedback first
    await this.db
      .delete(reputationFeedback)
      .where(eq(reputationFeedback.agentId, agentId));

    // Delete reputation
    const result = await this.db
      .delete(agentReputations)
      .where(eq(agentReputations.agentId, agentId))
      .returning();

    return result.length > 0;
  }

  async agentExists(agentId: string): Promise<boolean> {
    if (this.skipAgentValidation) return true;

    const { agents } = this.schema;

    const result = await this.db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);

    return result.length > 0;
  }
}

// ============================================
// PostgreSQL Validation Storage
// ============================================

/**
 * PostgreSQL implementation of validation storage
 */
export class PostgresValidationStorage implements ValidationStorageProvider {
  constructor(
    private db: DrizzleDB,
    private schema: Schema,
    private skipAgentValidation = false
  ) {}

  async createValidation(request: TaskValidationRequest): Promise<TaskValidation> {
    const { taskValidations } = this.schema;
    const id = generateId('val');
    const now = new Date();

    await this.db.insert(taskValidations).values({
      id,
      taskId: request.taskId,
      agentId: request.agentId,
      validatorId: request.validatorId,
      validatorAddress: request.validatorAddress,
      validationType: request.validationType,
      status: 'pending',
      proof: request.proof,
      paymentHash: request.paymentHash,
      createdAt: now,
    });

    return {
      ...request,
      id,
      status: 'pending',
      createdAt: now,
    };
  }

  async getValidation(validationId: string): Promise<TaskValidation | null> {
    const { taskValidations } = this.schema;

    const result = await this.db
      .select()
      .from(taskValidations)
      .where(eq(taskValidations.id, validationId))
      .limit(1);

    if (result.length === 0) return null;

    return this.mapToTaskValidation(result[0]);
  }

  async getValidationByTaskId(taskId: string): Promise<TaskValidation | null> {
    const { taskValidations } = this.schema;

    const result = await this.db
      .select()
      .from(taskValidations)
      .where(eq(taskValidations.taskId, taskId))
      .limit(1);

    if (result.length === 0) return null;

    return this.mapToTaskValidation(result[0]);
  }

  async getValidationByTaskAndValidator(taskId: string, validatorId: string): Promise<TaskValidation | null> {
    const { taskValidations } = this.schema;

    const result = await this.db
      .select()
      .from(taskValidations)
      .where(
        and(
          eq(taskValidations.taskId, taskId),
          eq(taskValidations.validatorId, validatorId)
        )
      )
      .limit(1);

    if (result.length === 0) return null;

    return this.mapToTaskValidation(result[0]);
  }

  async updateValidation(
    validationId: string,
    updates: { status?: ValidationStatus; proof?: string; attestationHash?: string; validatedAt?: Date }
  ): Promise<TaskValidation | null> {
    const { taskValidations } = this.schema;

    const updateData: Record<string, unknown> = {};
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.proof !== undefined) updateData.proof = updates.proof;
    if (updates.attestationHash !== undefined) updateData.attestationHash = updates.attestationHash;
    if (updates.validatedAt !== undefined) updateData.validatedAt = updates.validatedAt;

    const [updated] = await this.db
      .update(taskValidations)
      .set(updateData)
      .where(eq(taskValidations.id, validationId))
      .returning();

    if (!updated) return null;

    return this.mapToTaskValidation(updated);
  }

  async listValidationsForAgent(agentId: string, options?: ListValidationsOptions): Promise<TaskValidation[]> {
    const { taskValidations } = this.schema;

    let query = this.db
      .select()
      .from(taskValidations)
      .where(eq(taskValidations.agentId, agentId));

    if (options?.status) {
      query = this.db
        .select()
        .from(taskValidations)
        .where(
          and(
            eq(taskValidations.agentId, agentId),
            eq(taskValidations.status, options.status)
          )
        );
    }

    const results = await query
      .orderBy(desc(taskValidations.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return results.map(r => this.mapToTaskValidation(r));
  }

  async deleteValidation(validationId: string): Promise<boolean> {
    const { taskValidations } = this.schema;

    const result = await this.db
      .delete(taskValidations)
      .where(eq(taskValidations.id, validationId))
      .returning();

    return result.length > 0;
  }

  async agentExists(agentId: string): Promise<boolean> {
    if (this.skipAgentValidation) return true;

    const { agents } = this.schema;

    const result = await this.db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);

    return result.length > 0;
  }

  private mapToTaskValidation(record: {
    id: string;
    taskId: string;
    agentId: string;
    validatorId: string;
    validatorAddress: string | null;
    validationType: string;
    status: string;
    proof: string | null;
    attestationHash: string | null;
    paymentHash: string | null;
    createdAt: Date;
    validatedAt: Date | null;
  }): TaskValidation {
    return {
      id: record.id,
      taskId: record.taskId,
      agentId: record.agentId,
      validatorId: record.validatorId,
      validatorAddress: record.validatorAddress || undefined,
      validationType: record.validationType as TaskValidation['validationType'],
      status: record.status as ValidationStatus,
      proof: record.proof || undefined,
      attestationHash: record.attestationHash || undefined,
      paymentHash: record.paymentHash || undefined,
      createdAt: record.createdAt,
      validatedAt: record.validatedAt || undefined,
    };
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Creates a PostgreSQL storage provider
 * 
 * @param options - Configuration options
 * @returns ARC8004StorageProvider backed by PostgreSQL
 * @throws Error if database connection fails
 * 
 * @example
 * ```typescript
 * const storage = await createPostgresStorage();
 * const identity = await storage.identity.getIdentity('agent_123');
 * ```
 */
export async function createPostgresStorage(options?: {
  skipAgentValidation?: boolean;
}): Promise<ARC8004StorageProvider> {
  // Dynamically import to avoid crash when DATABASE_URL is not set
  const { db } = await import('@/lib/db');
  const schema = await import('@/lib/db/schema');

  const skipValidation = options?.skipAgentValidation ?? false;

  return {
    identity: new PostgresIdentityStorage(db, schema, skipValidation),
    reputation: new PostgresReputationStorage(db, schema, skipValidation),
    validation: new PostgresValidationStorage(db, schema, skipValidation),
  };
}
