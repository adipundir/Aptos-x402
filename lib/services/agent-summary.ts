/**
 * Agent Summary Service
 * Provides summaries for agents including balance and stats
 */

import { getAgentsWithWallets, getAgentForClient, type Agent } from '@/lib/storage/agents';
import { getChatWithMessages } from '@/lib/storage/chats';
import { getAgentWalletBalance } from '@/lib/storage/agent-wallets';
import { ReputationRegistry } from '@/lib/arc8004/reputation/registry';
import { getTrustLevelLabel, getTrustLevelColor } from '@/lib/arc8004/reputation/scoring';

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

const FALLBACK_STATS: AgentStatsSummary = {
  requests: 0,
  apiCalls: 0,
  totalSpentAPT: '0.00000000',
  totalSpentUSD: '0.00',
};

const APT_TO_USD = 10; // TODO: replace with dynamic pricing feed when available

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

      const [stats] = await Promise.all([
        getAgentStats(agent.id, userId).catch(() => ({ ...FALLBACK_STATS })),
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
      } as AgentSummary;
    })
  );
}
