/**
 * ARC-8004 Validation Registry
 * Manages task validation with cryptographic attestations
 */

import { Aptos, Account } from '@aptos-labs/ts-sdk';
import { eq, and } from 'drizzle-orm';
import { getAptosClient } from '@/lib/aptos-utils';
import { db } from '@/lib/db';
import { taskValidations, agents } from '@/lib/db/schema';
import type {
  TaskValidationRequest,
  TaskValidation,
  ValidationResult,
  ValidationType,
  ValidationStatus,
  ARC8004Config,
} from '../types';
import { DEFAULT_ARC8004_CONFIG } from '../types';

/**
 * Generate unique ID for validation records
 */
function generateValidationId(): string {
  return `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * ARC-8004 Validation Registry
 * Manages task validation and cryptographic attestations
 */
export class ValidationRegistry {
  private aptos: Aptos;
  private network: string;
  private moduleAddress: string;
  private config: ARC8004Config;

  constructor(config?: Partial<ARC8004Config>) {
    this.config = { ...DEFAULT_ARC8004_CONFIG, ...config };
    this.network = this.config.network;
    this.moduleAddress = this.config.moduleAddress || process.env.ARC8004_MODULE_ADDRESS || '';
    this.aptos = getAptosClient(this.network);
  }

  /**
   * Submit a task validation
   */
  async submitValidation(
    request: TaskValidationRequest,
    signer?: Account
  ): Promise<{ validationId: string; attestationHash?: string }> {
    // Validate request
    this.validateRequest(request);

    // Check if agent exists
    const agentResult = await db
      .select()
      .from(agents)
      .where(eq(agents.id, request.agentId))
      .limit(1);

    if (agentResult.length === 0) {
      throw new Error(`Agent not found: ${request.agentId}`);
    }

    // Check for existing validation on same task
    const existingValidation = await db
      .select()
      .from(taskValidations)
      .where(
        and(
          eq(taskValidations.taskId, request.taskId),
          eq(taskValidations.validatorId, request.validatorId)
        )
      )
      .limit(1);

    if (existingValidation.length > 0) {
      throw new Error(
        `Validation already exists for task ${request.taskId} by validator ${request.validatorId}`
      );
    }

    // Create validation record
    const validationId = generateValidationId();
    const now = new Date();

    await db.insert(taskValidations).values({
      id: validationId,
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

    // Create on-chain attestation if signer provided
    let attestationHash: string | undefined;
    if (signer && this.config.onChainEnabled && this.moduleAddress) {
      attestationHash = await this.createOnChainValidation(
        request.taskId,
        request.agentId,
        request.validatorId,
        request.proof,
        signer
      );

      // Update with attestation hash
      await db
        .update(taskValidations)
        .set({ attestationHash })
        .where(eq(taskValidations.id, validationId));
    }

    return { validationId, attestationHash };
  }

  /**
   * Approve/validate a task
   */
  async approveValidation(
    validationId: string,
    proof?: string
  ): Promise<TaskValidation> {
    const now = new Date();

    const [updated] = await db
      .update(taskValidations)
      .set({
        status: 'validated',
        proof: proof,
        validatedAt: now,
      })
      .where(eq(taskValidations.id, validationId))
      .returning();

    if (!updated) {
      throw new Error(`Validation not found: ${validationId}`);
    }

    return this.mapToTaskValidation(updated);
  }

  /**
   * Reject a task validation
   */
  async rejectValidation(validationId: string): Promise<TaskValidation> {
    const now = new Date();

    const [updated] = await db
      .update(taskValidations)
      .set({
        status: 'rejected',
        validatedAt: now,
      })
      .where(eq(taskValidations.id, validationId))
      .returning();

    if (!updated) {
      throw new Error(`Validation not found: ${validationId}`);
    }

    return this.mapToTaskValidation(updated);
  }

  /**
   * Get validation by ID
   */
  async getValidation(validationId: string): Promise<TaskValidation | null> {
    const result = await db
      .select()
      .from(taskValidations)
      .where(eq(taskValidations.id, validationId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToTaskValidation(result[0]);
  }

  /**
   * Get validation by task ID
   */
  async getValidationByTaskId(taskId: string): Promise<TaskValidation | null> {
    const result = await db
      .select()
      .from(taskValidations)
      .where(eq(taskValidations.taskId, taskId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToTaskValidation(result[0]);
  }

  /**
   * Get all validations for an agent
   */
  async getValidationsForAgent(
    agentId: string,
    options?: { status?: ValidationStatus; limit?: number }
  ): Promise<TaskValidation[]> {
    // Build where condition based on options
    const whereCondition = options?.status
      ? and(
          eq(taskValidations.agentId, agentId),
          eq(taskValidations.status, options.status)
        )
      : eq(taskValidations.agentId, agentId);

    const results = await db
      .select()
      .from(taskValidations)
      .where(whereCondition)
      .limit(options?.limit || 50);
      
    return results.map(r => this.mapToTaskValidation(r));
  }

  /**
   * Verify task completion for x402 payment settlement
   */
  async verifyTaskForPayment(
    taskId: string,
    agentId: string
  ): Promise<ValidationResult> {
    const validation = await this.getValidationByTaskId(taskId);

    if (!validation) {
      return {
        taskId,
        isValid: false,
        validatorId: 'system',
        timestamp: Date.now(),
      };
    }

    if (validation.agentId !== agentId) {
      return {
        taskId,
        isValid: false,
        validatorId: validation.validatorId,
        timestamp: Date.now(),
      };
    }

    return {
      taskId,
      isValid: validation.status === 'validated',
      validatorId: validation.validatorId,
      proof: validation.proof,
      attestationHash: validation.attestationHash,
      timestamp: validation.validatedAt?.getTime() || Date.now(),
    };
  }

  /**
   * Create on-chain validation attestation
   */
  private async createOnChainValidation(
    taskId: string,
    agentId: string,
    validatorId: string,
    proof: string | undefined,
    signer: Account
  ): Promise<string> {
    const transaction = await this.aptos.transaction.build.simple({
      sender: signer.accountAddress,
      data: {
        function: `${this.moduleAddress}::validation::submit_validation`,
        functionArguments: [
          taskId,
          agentId,
          validatorId,
          proof || '',
        ],
      },
    });

    const committed = await this.aptos.signAndSubmitTransaction({
      signer,
      transaction,
    });

    await this.aptos.waitForTransaction({ transactionHash: committed.hash });

    return committed.hash;
  }

  /**
   * Validate request
   */
  private validateRequest(request: TaskValidationRequest): void {
    if (!request.taskId) {
      throw new Error('Task ID is required');
    }
    if (!request.agentId) {
      throw new Error('Agent ID is required');
    }
    if (!request.validatorId) {
      throw new Error('Validator ID is required');
    }
    if (!this.isValidValidationType(request.validationType)) {
      throw new Error(`Invalid validation type: ${request.validationType}`);
    }
  }

  /**
   * Check if validation type is valid
   */
  private isValidValidationType(type: string): type is ValidationType {
    return ['manual', 'zkproof', 'tee', 'oracle'].includes(type);
  }

  /**
   * Map database record to TaskValidation type
   */
  private mapToTaskValidation(record: typeof taskValidations.$inferSelect): TaskValidation {
    return {
      id: record.id,
      taskId: record.taskId,
      agentId: record.agentId,
      validatorId: record.validatorId,
      validatorAddress: record.validatorAddress || undefined,
      validationType: record.validationType as ValidationType,
      status: record.status as ValidationStatus,
      proof: record.proof || undefined,
      attestationHash: record.attestationHash || undefined,
      paymentHash: record.paymentHash || undefined,
      createdAt: record.createdAt,
      validatedAt: record.validatedAt || undefined,
    };
  }

  /**
   * Delete validation
   */
  async deleteValidation(validationId: string): Promise<boolean> {
    const result = await db
      .delete(taskValidations)
      .where(eq(taskValidations.id, validationId))
      .returning();

    return result.length > 0;
  }
}

