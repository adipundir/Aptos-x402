import { NextRequest, NextResponse } from 'next/server';
import { getAgentById } from '@/lib/storage/agents';
import { getWalletBalance } from '@/lib/agent/wallet';

export const dynamic = 'force-dynamic';

// Helper to get userId from request (can be extended with auth later)
function getUserId(request: Request): string {
  // For now, use a default userId or extract from headers/cookies
  // TODO: Replace with actual authentication logic
  const userId = request.headers.get('x-user-id') || 'default-user';
  return userId;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const userId = getUserId(request);
    const { agentId } = await params;
    const agent = await getAgentById(agentId, userId);
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Ensure wallet address is in correct format
    const walletAddress = agent.walletAddress.startsWith('0x') 
      ? agent.walletAddress 
      : `0x${agent.walletAddress}`;

    const walletInfo = await getWalletBalance(walletAddress, 'testnet');
    
    return NextResponse.json({ 
      balance: walletInfo.balance,
      balanceAPT: walletInfo.balanceAPT,
      address: walletInfo.address,
    });
  } catch (error: any) {
    console.error('Error fetching wallet balance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}

