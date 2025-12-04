/**
 * Fund Agent Wallet API (Testnet only)
 * Request funds from faucet for agent wallet
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAgentById } from '@/lib/storage/agents';
import { fundAgentWalletFromFaucet, getAgentWalletBalance } from '@/lib/storage/agent-wallets';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { agentId } = await params;
    
    // Verify user owns this agent
    const agent = await getAgentById(agentId, userId);
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    if (agent.userId !== userId) {
      return NextResponse.json(
        { error: 'You can only fund your own agents' },
        { status: 403 }
      );
    }

    const result = await fundAgentWalletFromFaucet(agentId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fund wallet' },
        { status: 400 }
      );
    }

    // Get updated balance
    const balance = await getAgentWalletBalance(agentId);

    return NextResponse.json({
      success: true,
      balanceAPT: balance.balanceAPT,
      balanceOctas: balance.balanceOctas,
      address: balance.address,
    });
  } catch (error: any) {
    console.error('Error funding agent wallet:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fund wallet' },
      { status: 500 }
    );
  }
}

