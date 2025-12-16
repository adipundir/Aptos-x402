/**
 * Agent Summary Service
 * Provides summaries for agents including balance and stats
 */

import { getAgentsWithWallets, getAgentForClient, type Agent } from '@/lib/storage/agents';
import { getChatWithMessages } from '@/lib/storage/chats';
import { getAgentWalletBalance } from '@/lib/storage/agent-wallets';
import { ReputationRegistry } from '@/lib/arc8004/reputation/registry';
import { getTrustLevelLabel, getTrustLevelColor } from '@/lib/arc8004/reputation/scoring';
import { createOnChainProvider, type OnChainAgentScore } from '@/lib/arc8004/chain/types';

export type ClientAgent = ReturnType<typeof getAgentForClient>;

export interface AgentStatsSummary {
  requests: number;
  apiCalls: number;
  totalSpentAPT: string;
  totalSpentUSD: string;
}

export interface AgentBalanceSummary {
  balance: string;
  balanceAPT: string;
  address: string;
  publicKey: string;
  isOwner: boolean;
}

export interface AgentSummary {
  agent: ClientAgent;
  balance: AgentBalanceSummary;
  stats: AgentStatsSummary;
  trust?: AgentTrustSummary;
  identity?: AgentIdentitySummary;
  onChainScore?: OnChainScoreSummary;
}

export interface AgentIdentitySummary {
  verified: boolean;
  tokenAddress?: string;
  ownerAddress?: string;
  capabilities?: string[];
}

export interface AgentTrustSummary {
  trustLevel: number;
  trustLabel: string;
  trustColor: string;
  averageScore: number;
  feedbackCount: number;
}

export interface OnChainScoreSummary {
  /** Whether on-chain score exists */
  hasOnChainScore: boolean;
  /** Trust level (0-5) */
  trustLevel: number;
  /** Trust level label */
  trustLabel: string;
  /** Trust level color */
  trustColor: string;
  /** Average score (1-5, scaled from on-chain) */
  averageScore: number;
  /** Number of on-chain feedback attestations */
  feedbackCount: number;
  /** Last updated timestamp */
  lastUpdated?: Date;
}

const FALLBACK_STATS: AgentStatsSummary = {
  requests: 0,
  apiCalls: 0,
  totalSpentAPT: '0.00000000',
  totalSpentUSD: '0.00',
};

const APT_TO_USD = 10; // TODO: replace with dynamic pricing feed when available

// On-chain trust level labels matching Move contract
const ON_CHAIN_TRUST_LABELS: Record<number, string> = {
  0: 'Unknown',
  1: 'New',
  2: 'Developing',
  3: 'Established',
  4: 'Trusted',
  5: 'Excellent',
};

const ON_CHAIN_TRUST_COLORS: Record<number, string> = {
  0: '#9ca3af', // gray
  1: '#f59e0b', // amber
  2: '#3b82f6', // blue
  3: '#8b5cf6', // purple
  4: '#22c55e', // green
  5: '#10b981', // emerald
};

/**
 * Fetch on-chain score for an agent
 */
export async function getOnChainScore(agentId: string): Promise<OnChainScoreSummary | undefined> {
  const moduleAddress = process.env.ARC8004_MODULE_ADDRESS;
  const onChainEnabled = process.env.ARC8004_ONCHAIN_ENABLED === 'true';

  if (!onChainEnabled || !moduleAddress) {
    return undefined;
  }

  try {
    const provider = createOnChainProvider({
      enabled: true,
      moduleAddress,
      network: process.env.ARC8004_NETWORK || 'aptos-testnet',
    });

    const score = await provider.getAgentScore(agentId);

    if (!score) {
      return {
        hasOnChainScore: false,
        trustLevel: 0,
        trustLabel: ON_CHAIN_TRUST_LABELS[0],
        trustColor: ON_CHAIN_TRUST_COLORS[0],
        averageScore: 0,
        feedbackCount: 0,
      };
    }

    return {
      hasOnChainScore: true,
      trustLevel: score.trustLevel,
      trustLabel: ON_CHAIN_TRUST_LABELS[score.trustLevel] || 'Unknown',
      trustColor: ON_CHAIN_TRUST_COLORS[score.trustLevel] || ON_CHAIN_TRUST_COLORS[0],
      averageScore: score.averageScoreScaled / 100, // Convert from scaled (450) to actual (4.5)
      feedbackCount: score.feedbackCount,
      lastUpdated: score.lastUpdated > 0 ? new Date(score.lastUpdated * 1000) : undefined,
    };
  } catch (err) {
    console.warn('[AgentSummary] Failed to fetch on-chain score:', err);
    return undefined;
  }
}

export async function getAgentStats(agentId: string, userId: string): Promise<AgentStatsSummary> {
  const chatData = await getChatWithMessages(agentId, userId);

  if (!chatData) {
    return { ...FALLBACK_STATS };
  }

  let totalRequests = 0;
  let totalSpentAPT = 0;
  let apiCallsCount = 0;

  for (const message of chatData.messages) {
    if (message.role === 'user') {
      totalRequests += 1;
    }

    if (message.metadata?.apiCalled) {
      apiCallsCount += 1;

      if (message.metadata.paymentAmount) {
        const amountInOctas = Number.parseFloat(message.metadata.paymentAmount);
        if (!Number.isNaN(amountInOctas)) {
          totalSpentAPT += amountInOctas / 100_000_000;
        }
      }
    }
  }

  const totalSpentUSD = totalSpentAPT * APT_TO_USD;

  return {
    requests: totalRequests,
    apiCalls: apiCallsCount,
    totalSpentAPT: totalSpentAPT.toFixed(8),
    totalSpentUSD: totalSpentUSD.toFixed(2),
  };
}

export async function getAgentBalance(agent: Agent, userId: string): Promise<AgentBalanceSummary> {
  const isOwner = agent.userId === userId;
  
  // Each agent has its own wallet
  const walletBalance = await getAgentWalletBalance(agent.id);

  return {
    balance: walletBalance.balanceOctas,
    balanceAPT: walletBalance.balanceAPT,
    address: walletBalance.address || '',
    publicKey: walletBalance.publicKey || '',
    isOwner,
  };
}

export async function getAgentSummariesForUser(
  userId: string,
  scope?: 'mine' | 'public'
): Promise<AgentSummary[]> {
  const agents = await getAgentsWithWallets(scope, userId);

  return Promise.all(
    agents.map(async (agent) => {
      const clientAgent = getAgentForClient(agent);
      const isOwner = agent.userId === userId;

      // Get agent's wallet balance
      const walletBalance = await getAgentWalletBalance(agent.id);

      const [stats, onChainScore] = await Promise.all([
        getAgentStats(agent.id, userId).catch(() => ({ ...FALLBACK_STATS })),
        getOnChainScore(agent.id).catch(() => undefined),
      ]);

      // Trust data from reputation registry (best-effort)
      let trust: AgentTrustSummary | undefined;
      try {
        const repRegistry = new ReputationRegistry();
        const rep = await repRegistry.getReputation(agent.id);
        if (rep) {
          trust = {
            trustLevel: rep.trustLevel,
            trustLabel: getTrustLevelLabel(rep.trustLevel),
            trustColor: getTrustLevelColor(rep.trustLevel),
            averageScore: rep.averageScore,
            feedbackCount: rep.totalFeedback,
          };
        }
      } catch (err) {
        // ignore reputation errors
      }

      const identity: AgentIdentitySummary | undefined = (agent as any).identity
        ? {
            verified: !!(agent as any).identity?.verified,
            tokenAddress: (agent as any).identity?.tokenAddress || undefined,
            ownerAddress: (agent as any).identity?.agentCard?.owner?.address,
            capabilities: (agent as any).identity?.agentCard?.capabilities,
          }
        : undefined;

      return {
        agent: clientAgent,
        balance: {
          balance: walletBalance.balanceOctas,
          balanceAPT: walletBalance.balanceAPT,
          address: walletBalance.address || '',
          publicKey: walletBalance.publicKey || '',
          isOwner,
        },
        stats,
        trust,
        identity,
        onChainScore,
      } as AgentSummary;
    })
  );
}
