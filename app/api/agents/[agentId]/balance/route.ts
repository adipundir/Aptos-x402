/**
 * Agent Balance API
 * Get the user's shared payment wallet balance
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAgentById } from '@/lib/storage/agents';
import { getPaymentWalletBalance } from '@/lib/storage/payment-wallets';

export const dynamic = 'force-dynamic';

export async function GET(
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
    const agent = await getAgentById(agentId, userId);
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Get the user's shared payment wallet balance
    const balance = await getPaymentWalletBalance(userId);

    return NextResponse.json({
      balanceAPT: balance.balanceAPT,
      balanceOctas: balance.balanceOctas,
      address: balance.address,
      walletType: 'shared', // Indicates shared payment wallet
      isOwner: agent.userId === userId,
    });
  } catch (error: any) {
    console.error('Error fetching wallet balance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}
