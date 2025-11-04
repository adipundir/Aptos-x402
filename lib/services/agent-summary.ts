import { getAllAgents, getAgentForClient, type Agent } from '@/lib/storage/agents';
import { getChatWithMessages } from '@/lib/storage/chats';
import { getWalletBalance } from '@/lib/agent/wallet';
import { getOrCreateUserWallet } from '@/lib/storage/user-wallets';

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
  walletType: 'agent' | 'user';
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
  const shouldUseUserWallet = agent.visibility === 'public' && !isOwner;

  let walletAddress = agent.walletAddress;
  let walletType: 'agent' | 'user' = 'agent';

  if (shouldUseUserWallet) {
    const userWallet = await getOrCreateUserWallet(userId);
    walletAddress = userWallet.walletAddress;
    walletType = 'user';
  }

  const formattedAddress = walletAddress.startsWith('0x')
    ? walletAddress
    : `0x${walletAddress}`;

  const walletInfo = await getWalletBalance(formattedAddress, 'testnet');

  return {
    balance: walletInfo.balance,
    balanceAPT: walletInfo.balanceAPT,
    address: walletInfo.address,
    walletType,
    isOwner,
  };
}

export async function getAgentSummariesForUser(
  userId: string,
  scope?: 'mine' | 'public'
): Promise<AgentSummary[]> {
  const agents = await getAllAgents(scope, userId);

  return Promise.all(
    agents.map(async (agent) => {
      const clientAgent = getAgentForClient(agent);

      const [balance, stats] = await Promise.all([
        getAgentBalance(agent, userId).catch(() => {
          const fallbackAddress = clientAgent.walletAddress.startsWith('0x')
            ? clientAgent.walletAddress
            : `0x${clientAgent.walletAddress}`;

          return {
            balance: '0',
            balanceAPT: '0.00000000',
            address: fallbackAddress,
            walletType: 'agent' as const,
            isOwner: clientAgent.userId === userId,
          } as AgentBalanceSummary;
        }),
        getAgentStats(agent.id, userId).catch(() => ({ ...FALLBACK_STATS })),
      ]);

      return {
        agent: clientAgent,
        balance,
        stats,
      } as AgentSummary;
    })
  );
}
