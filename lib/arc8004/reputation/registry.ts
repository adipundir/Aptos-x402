/**
 * ARC-8004 Reputation Registry
 * Manages agent reputation with on-chain attestations
 */

import { Aptos, Account } from '@aptos-labs/ts-sdk';
import { eq, desc } from 'drizzle-orm';
import { getAptosClient } from '@/lib/aptos-utils';
import { db } from '@/lib/db';
import { agentReputations, reputationFeedback, agents } from '@/lib/db/schema';
import type {
  FeedbackSubmission,
  FeedbackRecord,
  AgentReputationScore,
  ARC8004Config,
} from '../types';
import { resolveARC8004Config } from '../types';
import { calculateTrustLevel, calculateSuccessRate, calculateAverage } from './scoring';

/**
 * Generate unique ID for feedback records
 */
function generateFeedbackId(): string {
  return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique ID for reputation records
 */
function generateReputationId(agentId: string): string {
  return `rep_${agentId}`;
}

/**
 * ARC-8004 Reputation Registry
 * Manages agent reputation scores and feedback with optional on-chain attestations
 */
export class ReputationRegistry {
  private aptos: Aptos;
  private network: string;
  private moduleAddress: string;
  private config: ARC8004Config;

  constructor(config?: Partial<ARC8004Config>) {
    this.config = resolveARC8004Config(config);
    this.network = this.config.network || 'aptos-testnet';
    this.moduleAddress = this.config.moduleAddress || '';
    this.aptos = getAptosClient(this.network);
  }

  /**
   * Submit feedback for an agent
   */
  async submitFeedback(
    feedback: FeedbackSubmission,
    signer?: Account
  ): Promise<{ feedbackId: string; attestationHash?: string }> {
    // Validate feedback
    this.validateFeedback(feedback);

    // Check if agent exists
    const agentResult = await db
      .select()
      .from(agents)
      .where(eq(agents.id, feedback.agentId))
      .limit(1);

    if (agentResult.length === 0) {
      throw new Error(`Agent not found: ${feedback.agentId}`);
    }

    // Create feedback record
    const feedbackId = generateFeedbackId();
    const now = new Date();

    await db.insert(reputationFeedback).values({
      id: feedbackId,
      agentId: feedback.agentId,
      clientAddress: feedback.clientAddress,
      jobId: feedback.jobId,
      overallScore: feedback.overallScore,
      reliabilityScore: feedback.reliabilityScore,
      speedScore: feedback.speedScore,
      accuracyScore: feedback.accuracyScore,
      tags: feedback.tags || [],
      comment: feedback.comment,
      paymentHash: feedback.paymentHash,
      paymentAmount: feedback.paymentAmount,
      createdAt: now,
    });

    // Update aggregated reputation
    await this.updateAggregatedReputation(feedback.agentId);

    // Create on-chain attestation if signer provided and on-chain is enabled
    let attestationHash: string | undefined;
    if (signer && this.config.onChainEnabled && this.moduleAddress) {
      attestationHash = await this.createOnChainAttestation(
        feedback.agentId,
        feedback.clientAddress,
        feedback.overallScore,
        feedback.paymentHash,
        signer
      );

      // Update feedback with attestation hash
      await db
        .update(reputationFeedback)
        .set({ attestationHash })
        .where(eq(reputationFeedback.id, feedbackId));
    }

    return { feedbackId, attestationHash };
  }

  /**
   * Get agent reputation score
   */
  async getReputation(agentId: string): Promise<AgentReputationScore | null> {
    const result = await db
      .select()
      .from(agentReputations)
      .where(eq(agentReputations.agentId, agentId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

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

  /**
   * Get feedback history for an agent
   */
  async getFeedbackHistory(
    agentId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<FeedbackRecord[]> {
    const results = await db
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

  /**
   * Record a successful transaction (increments success count)
   */
  async recordTransaction(
    agentId: string,
    successful: boolean,
    paymentHash?: string
  ): Promise<void> {
    // Ensure reputation record exists
    await this.ensureReputationRecord(agentId);

    const result = await db
      .select()
      .from(agentReputations)
      .where(eq(agentReputations.agentId, agentId))
      .limit(1);

    if (result.length === 0) return;

    const current = result[0];
    const newTotal = (current.totalTransactions || 0) + 1;
    const newSuccessful = successful
      ? (current.successfulTransactions || 0) + 1
      : (current.successfulTransactions || 0);

    // Recalculate trust level
    const newTrustLevel = calculateTrustLevel({
      averageScore: current.averageScore || 0,
      feedbackCount: current.totalFeedbackCount || 0,
      successRate: newTotal > 0 ? newSuccessful / newTotal : 0,
      reliabilityScore: current.reliabilityScore || 0,
      speedScore: current.speedScore || 0,
      accuracyScore: current.accuracyScore || 0,
    });

    await db
      .update(agentReputations)
      .set({
        totalTransactions: newTotal,
        successfulTransactions: newSuccessful,
        trustLevel: newTrustLevel,
        updatedAt: new Date(),
      })
      .where(eq(agentReputations.agentId, agentId));
  }

  /**
   * Update aggregated reputation from all feedback
   */
  private async updateAggregatedReputation(agentId: string): Promise<void> {
    // Get all feedback for agent
    const feedback = await db
      .select()
      .from(reputationFeedback)
      .where(eq(reputationFeedback.agentId, agentId));

    const count = feedback.length;
    if (count === 0) return;

    // Calculate averages
    const overallScores = feedback.map(f => f.overallScore);
    const reliabilityScores = feedback
      .filter(f => f.reliabilityScore != null)
      .map(f => f.reliabilityScore!);
    const speedScores = feedback
      .filter(f => f.speedScore != null)
      .map(f => f.speedScore!);
    const accuracyScores = feedback
      .filter(f => f.accuracyScore != null)
      .map(f => f.accuracyScore!);

    const avgScore = calculateAverage(overallScores);
    const avgReliability = reliabilityScores.length > 0
      ? calculateAverage(reliabilityScores)
      : 0;
    const avgSpeed = speedScores.length > 0
      ? calculateAverage(speedScores)
      : 0;
    const avgAccuracy = accuracyScores.length > 0
      ? calculateAverage(accuracyScores)
      : 0;

    // Get existing reputation for transaction data
    const existing = await db
      .select()
      .from(agentReputations)
      .where(eq(agentReputations.agentId, agentId))
      .limit(1);

    const totalTransactions = existing.length > 0
      ? (existing[0].totalTransactions || 0)
      : 0;
    const successfulTransactions = existing.length > 0
      ? (existing[0].successfulTransactions || 0)
      : 0;

    // Calculate trust level
    const trustLevel = calculateTrustLevel({
      averageScore: avgScore,
      feedbackCount: count,
      successRate: totalTransactions > 0
        ? successfulTransactions / totalTransactions
        : 1, // Default to 100% if no transactions yet
      reliabilityScore: avgReliability,
      speedScore: avgSpeed,
      accuracyScore: avgAccuracy,
    });

    // Upsert reputation record
    const repId = generateReputationId(agentId);
    const now = new Date();

    if (existing.length === 0) {
      await db.insert(agentReputations).values({
        id: repId,
        agentId,
        totalScore: Math.round(avgScore * count),
        totalFeedbackCount: count,
        averageScore: avgScore,
        reliabilityScore: avgReliability,
        speedScore: avgSpeed,
        accuracyScore: avgAccuracy,
        trustLevel,
        totalTransactions: 0,
        successfulTransactions: 0,
        updatedAt: now,
      });
    } else {
      await db
        .update(agentReputations)
        .set({
          totalScore: Math.round(avgScore * count),
          totalFeedbackCount: count,
          averageScore: avgScore,
          reliabilityScore: avgReliability,
          speedScore: avgSpeed,
          accuracyScore: avgAccuracy,
          trustLevel,
          updatedAt: now,
        })
        .where(eq(agentReputations.agentId, agentId));
    }
  }

  /**
   * Ensure a reputation record exists for an agent
   */
  private async ensureReputationRecord(agentId: string): Promise<void> {
    const existing = await db
      .select()
      .from(agentReputations)
      .where(eq(agentReputations.agentId, agentId))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(agentReputations).values({
        id: generateReputationId(agentId),
        agentId,
        totalScore: 0,
        totalFeedbackCount: 0,
        averageScore: 0,
        reliabilityScore: 0,
        speedScore: 0,
        accuracyScore: 0,
        trustLevel: 0,
        totalTransactions: 0,
        successfulTransactions: 0,
        updatedAt: new Date(),
      });
    }
  }

  /**
   * Create on-chain attestation for feedback
   */
  private async createOnChainAttestation(
    agentId: string,
    clientAddress: string,
    score: number,
    paymentHash: string | undefined,
    signer: Account
  ): Promise<string> {
    const transaction = await this.aptos.transaction.build.simple({
      sender: signer.accountAddress,
      data: {
        function: `${this.moduleAddress}::reputation::attest_feedback`,
        functionArguments: [
          agentId,
          clientAddress,
          score,
          paymentHash || '',
        ],
      },
    });

    const committed = await this.aptos.signAndSubmitTransaction({
      signer,
      transaction,
    });

    await this.aptos.waitForTransaction({ transactionHash: committed.hash });

    // Update latest attestation hash in reputation
    await db
      .update(agentReputations)
      .set({
        latestAttestationHash: committed.hash,
        updatedAt: new Date(),
      })
      .where(eq(agentReputations.agentId, agentId));

    return committed.hash;
  }

  /**
   * Validate feedback submission
   */
  private validateFeedback(feedback: FeedbackSubmission): void {
    if (!feedback.agentId) {
      throw new Error('Agent ID is required');
    }
    if (!feedback.clientAddress) {
      throw new Error('Client address is required');
    }
    if (feedback.overallScore < 1 || feedback.overallScore > 5) {
      throw new Error('Overall score must be between 1 and 5');
    }
    if (feedback.reliabilityScore !== undefined &&
        (feedback.reliabilityScore < 1 || feedback.reliabilityScore > 5)) {
      throw new Error('Reliability score must be between 1 and 5');
    }
    if (feedback.speedScore !== undefined &&
        (feedback.speedScore < 1 || feedback.speedScore > 5)) {
      throw new Error('Speed score must be between 1 and 5');
    }
    if (feedback.accuracyScore !== undefined &&
        (feedback.accuracyScore < 1 || feedback.accuracyScore > 5)) {
      throw new Error('Accuracy score must be between 1 and 5');
    }
  }

  /**
   * Delete all reputation data for an agent
   */
  async deleteReputation(agentId: string): Promise<boolean> {
    // Delete feedback
    await db
      .delete(reputationFeedback)
      .where(eq(reputationFeedback.agentId, agentId));

    // Delete reputation
    const result = await db
      .delete(agentReputations)
      .where(eq(agentReputations.agentId, agentId))
      .returning();

    return result.length > 0;
  }
}

