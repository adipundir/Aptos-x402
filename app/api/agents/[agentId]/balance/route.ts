import { NextRequest, NextResponse } from 'next/server';
import { getAgentById } from '@/lib/storage/agents';
import { getWalletBalance } from '@/lib/agent/wallet';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const agent = getAgentById(agentId);
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    const walletInfo = await getWalletBalance(agent.walletAddress, 'testnet');
    
    return NextResponse.json({ 
      balance: walletInfo.balance,
      balanceAPT: walletInfo.balanceAPT,
      address: walletInfo.address,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}

