import { NextRequest, NextResponse } from 'next/server';
import { getAgentById } from '@/lib/storage/agents';
import { getWalletBalance } from '@/lib/agent/wallet';
import { getOrCreateUserWallet } from '@/lib/storage/user-wallets';

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

    // Determine which wallet balance to show:
    // - If user owns the agent: show agent's wallet balance
    // - If public agent used by someone else: show user's wallet balance
    const isOwner = agent.userId === userId;
    let walletAddress: string;
    let walletType: 'agent' | 'user' = 'agent';

    if (agent.visibility === 'public' && !isOwner) {
      // Public agent used by someone else - show user's wallet balance
      const userWallet = await getOrCreateUserWallet(userId);
      walletAddress = userWallet.walletAddress;
      walletType = 'user';
    } else {
      // User owns the agent (or it's private) - show agent's wallet balance
      walletAddress = agent.walletAddress;
      walletType = 'agent';
    }

    // Ensure wallet address is in correct format
    walletAddress = walletAddress.startsWith('0x') 
      ? walletAddress 
      : `0x${walletAddress}`;

    const walletInfo = await getWalletBalance(walletAddress, 'testnet');
    
    return NextResponse.json({ 
      balance: walletInfo.balance,
      balanceAPT: walletInfo.balanceAPT,
      address: walletInfo.address,
      walletType, // Indicate which wallet is being shown
      isOwner,
    });
  } catch (error: any) {
    console.error('Error fetching wallet balance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}

