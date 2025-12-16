/**
 * ARC-8004 On-Chain Reputation API
 * GET /api/arc8004/reputation/onchain - Get agent's on-chain reputation score
 */

import { NextRequest, NextResponse } from 'next/server';
import { createOnChainProvider } from '@/lib/arc8004/chain/types';

// Trust level labels matching Move contract
const TRUST_LABELS: Record<number, string> = {
  0: 'Unknown',
  1: 'New',
  2: 'Developing',
  3: 'Established',
  4: 'Trusted',
  5: 'Excellent',
};

const TRUST_COLORS: Record<number, string> = {
  0: '#9ca3af',
  1: '#f59e0b',
  2: '#3b82f6',
  3: '#8b5cf6',
  4: '#22c55e',
  5: '#10b981',
};

/**
 * GET /api/arc8004/reputation/onchain?agentId=xxx
 * Get agent's on-chain reputation score directly from blockchain
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId query parameter is required' },
        { status: 400 }
      );
    }

    const moduleAddress = process.env.ARC8004_MODULE_ADDRESS;
    const onChainEnabled = process.env.ARC8004_ONCHAIN_ENABLED === 'true';

    if (!onChainEnabled || !moduleAddress) {
      return NextResponse.json({
        success: true,
        onChainEnabled: false,
        message: 'On-chain reputation is not enabled. Set ARC8004_ONCHAIN_ENABLED=true and ARC8004_MODULE_ADDRESS in environment.',
        score: null,
      });
    }

    const provider = createOnChainProvider({
      enabled: true,
      moduleAddress,
      network: process.env.ARC8004_NETWORK || 'aptos-testnet',
    });

    const score = await provider.getAgentScore(agentId);

    if (!score) {
      return NextResponse.json({
        success: true,
        onChainEnabled: true,
        hasScore: false,
        agentId,
        score: null,
        message: 'No on-chain reputation found for this agent',
      });
    }

    return NextResponse.json({
      success: true,
      onChainEnabled: true,
      hasScore: true,
      agentId,
      score: {
        totalScore: score.totalScore,
        feedbackCount: score.feedbackCount,
        averageScore: score.averageScoreScaled / 100, // Convert 450 -> 4.5
        averageScoreScaled: score.averageScoreScaled,
        trustLevel: score.trustLevel,
        trustLabel: TRUST_LABELS[score.trustLevel] || 'Unknown',
        trustColor: TRUST_COLORS[score.trustLevel] || TRUST_COLORS[0],
        lastUpdated: score.lastUpdated > 0 ? new Date(score.lastUpdated * 1000).toISOString() : null,
      },
      contractAddress: moduleAddress,
      network: process.env.ARC8004_NETWORK || 'aptos-testnet',
    });
  } catch (error: any) {
    console.error('[ARC8004 OnChain Reputation] Error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to get on-chain reputation',
        hint: 'Make sure the contract is deployed and initialized with the new AgentScore table',
      },
      { status: 500 }
    );
  }
}
