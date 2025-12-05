/**
 * ARC-8004 Validation API
 * POST /api/arc8004/validation - Submit task validation
 * GET /api/arc8004/validation - Get validation status
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ValidationRegistry } from '@/lib/arc8004/validation/registry';
import type { ValidationType } from '@/lib/arc8004/types';

/**
 * GET /api/arc8004/validation?taskId=xxx
 * Get validation status for a task
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const validationId = searchParams.get('validationId');
    const agentId = searchParams.get('agentId');

    const registry = new ValidationRegistry();

    // Get by validation ID
    if (validationId) {
      const validation = await registry.getValidation(validationId);
      
      if (!validation) {
        return NextResponse.json(
          { error: 'Validation not found', validationId },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        validation,
      });
    }

    // Get by task ID
    if (taskId) {
      const validation = await registry.getValidationByTaskId(taskId);
      
      if (!validation) {
        return NextResponse.json({
          success: true,
          validation: null,
          message: 'No validation found for this task',
        });
      }

      return NextResponse.json({
        success: true,
        validation,
      });
    }

    // Get all validations for an agent
    if (agentId) {
      const status = searchParams.get('status') as any;
      const limit = parseInt(searchParams.get('limit') || '50');
      
      const validations = await registry.getValidationsForAgent(agentId, { status, limit });
      
      return NextResponse.json({
        success: true,
        agentId,
        validations,
        count: validations.length,
      });
    }

    return NextResponse.json(
      { error: 'taskId, validationId, or agentId query parameter is required' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[ARC8004 Validation GET] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get validation' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/arc8004/validation
 * Submit task validation
 * 
 * Body:
 * {
 *   taskId: string,
 *   agentId: string,
 *   validationType: 'manual' | 'zkproof' | 'tee' | 'oracle',
 *   proof?: string,
 *   paymentHash?: string,
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      taskId,
      agentId,
      validationType,
      proof,
      paymentHash,
      validatorAddress,
    } = body;

    // Validate required fields
    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      );
    }

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      );
    }

    if (!validationType) {
      return NextResponse.json(
        { error: 'validationType is required' },
        { status: 400 }
      );
    }

    const validTypes: ValidationType[] = ['manual', 'zkproof', 'tee', 'oracle'];
    if (!validTypes.includes(validationType)) {
      return NextResponse.json(
        { error: `validationType must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const registry = new ValidationRegistry();
    const result = await registry.submitValidation({
      taskId,
      agentId,
      validatorId: userId,
      validatorAddress,
      validationType,
      proof,
      paymentHash,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('[ARC8004 Validation POST] Error:', error);
    
    if (error.message?.includes('already exists')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to submit validation' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/arc8004/validation
 * Update validation status (approve/reject)
 * 
 * Body:
 * {
 *   validationId: string,
 *   action: 'approve' | 'reject',
 *   proof?: string,
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { validationId, action, proof } = body;

    if (!validationId) {
      return NextResponse.json(
        { error: 'validationId is required' },
        { status: 400 }
      );
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be either "approve" or "reject"' },
        { status: 400 }
      );
    }

    const registry = new ValidationRegistry();
    
    let validation;
    if (action === 'approve') {
      validation = await registry.approveValidation(validationId, proof);
    } else {
      validation = await registry.rejectValidation(validationId);
    }

    return NextResponse.json({
      success: true,
      validation,
    });
  } catch (error: any) {
    console.error('[ARC8004 Validation PATCH] Error:', error);
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update validation' },
      { status: 500 }
    );
  }
}

