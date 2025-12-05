/**
 * ARC-8004 Feedback API
 * POST /api/arc8004/reputation/feedback - Submit feedback for an agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ReputationRegistry } from '@/lib/arc8004/reputation/registry';
import type { FeedbackSubmission } from '@/lib/arc8004/types';

/**
 * POST /api/arc8004/reputation/feedback
 * Submit feedback for an agent
 * 
 * Body:
 * {
 *   agentId: string,
 *   overallScore: number, // 1-5
 *   reliabilityScore?: number,
 *   speedScore?: number,
 *   accuracyScore?: number,
 *   tags?: string[],
 *   comment?: string,
 *   paymentHash?: string,
 *   paymentAmount?: string,
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication (optional - could allow anonymous feedback)
    const session = await auth();
    
    const body = await request.json();
    const {
      agentId,
      overallScore,
      reliabilityScore,
      speedScore,
      accuracyScore,
      tags,
      comment,
      paymentHash,
      paymentAmount,
      clientAddress,
    } = body;

    // Validate required fields
    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      );
    }

    if (!overallScore || overallScore < 1 || overallScore > 5) {
      return NextResponse.json(
        { error: 'overallScore must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Use provided client address or session user ID
    const resolvedClientAddress = clientAddress || (session?.user as any)?.id || 'anonymous';

    const feedback: FeedbackSubmission = {
      agentId,
      clientAddress: resolvedClientAddress,
      overallScore,
      reliabilityScore,
      speedScore,
      accuracyScore,
      tags,
      comment,
      paymentHash,
      paymentAmount,
    };

    const registry = new ReputationRegistry();
    const result = await registry.submitFeedback(feedback);

    // Get updated reputation
    const reputation = await registry.getReputation(agentId);

    return NextResponse.json({
      success: true,
      feedbackId: result.feedbackId,
      attestationHash: result.attestationHash,
      updatedReputation: reputation,
    });
  } catch (error: any) {
    console.error('[ARC8004 Feedback POST] Error:', error);
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    if (error.message?.includes('must be between')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/arc8004/reputation/feedback?agentId=xxx
 * Get feedback history for an agent
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId query parameter is required' },
        { status: 400 }
      );
    }

    const registry = new ReputationRegistry();
    const history = await registry.getFeedbackHistory(agentId, { limit, offset });

    return NextResponse.json({
      success: true,
      agentId,
      feedback: history,
      pagination: {
        limit,
        offset,
        count: history.length,
      },
    });
  } catch (error: any) {
    console.error('[ARC8004 Feedback GET] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get feedback history' },
      { status: 500 }
    );
  }
}

