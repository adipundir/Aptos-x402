/**
 * Agent Summary Service
 * Provides summaries for agents including balance and stats
 */

import { getAgentsWithWallets, getAgentForClient, type Agent, type AgentWithWallet } from '@/lib/storage/agents';
import { getChatWithMessages } from '@/lib/storage/chats';
import { getAgentWalletBalance } from '@/lib/storage/agent-wallets';

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
      } as AgentSummary;
    })
  );
}
