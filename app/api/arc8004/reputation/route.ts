/**
 * ARC-8004 Reputation API
 * GET /api/arc8004/reputation - Get agent reputation
 */

import { NextRequest, NextResponse } from 'next/server';
import { ReputationRegistry } from '@/lib/arc8004/reputation/registry';
import { getTrustLevelLabel, getTrustLevelColor } from '@/lib/arc8004/reputation/scoring';

/**
 * GET /api/arc8004/reputation?agentId=xxx
 * Get agent reputation score
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const includeHistory = searchParams.get('includeHistory') === 'true';
    const historyLimit = parseInt(searchParams.get('historyLimit') || '10');

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId query parameter is required' },
        { status: 400 }
      );
    }

    const registry = new ReputationRegistry();
    const reputation = await registry.getReputation(agentId);

    if (!reputation) {
      // Return default reputation for new agents
      return NextResponse.json({
        success: true,
        reputation: {
          agentId,
          trustLevel: 0,
          trustLevelLabel: 'Unknown',
          trustLevelColor: '#6b7280',
          averageScore: 0,
          totalFeedback: 0,
          scores: {
            reliability: 0,
            speed: 0,
            accuracy: 0,
          },
          transactions: {
            total: 0,
            successful: 0,
            successRate: 0,
          },
        },
        history: [],
      });
    }

    // Add label and color
    const enrichedReputation = {
      ...reputation,
      trustLevelLabel: getTrustLevelLabel(reputation.trustLevel),
      trustLevelColor: getTrustLevelColor(reputation.trustLevel),
    };

    // Optionally include feedback history
    let history: any[] = [];
    if (includeHistory) {
      history = await registry.getFeedbackHistory(agentId, { limit: historyLimit });
    }

    return NextResponse.json({
      success: true,
      reputation: enrichedReputation,
      history,
    });
  } catch (error: any) {
    console.error('[ARC8004 Reputation GET] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get reputation' },
      { status: 500 }
    );
  }
}













