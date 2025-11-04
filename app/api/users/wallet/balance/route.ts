import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUserWallet, getUserWallet } from '@/lib/storage/user-wallets';
import { getWalletBalance } from '@/lib/agent/wallet';

export const dynamic = 'force-dynamic';

// Helper to get userId from request
function getUserId(request: Request): string {
  const userId = request.headers.get('x-user-id') || 'default-user';
  return userId;
}

export async function GET(request: Request) {
  try {
    const userId = getUserId(request);
    const userWallet = await getOrCreateUserWallet(userId);
    
    // Ensure wallet address is in correct format
    const walletAddress = userWallet.walletAddress.startsWith('0x') 
      ? userWallet.walletAddress 
      : `0x${userWallet.walletAddress}`;

    const walletInfo = await getWalletBalance(walletAddress, 'testnet');
    
    return NextResponse.json({ 
      balance: walletInfo.balance,
      balanceAPT: walletInfo.balanceAPT,
      address: walletInfo.address,
    });
  } catch (error: any) {
    console.error('Error fetching user wallet balance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch wallet balance' },
      { status: 500 }
    );
  }
}

