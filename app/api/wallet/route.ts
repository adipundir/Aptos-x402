/**
 * User Payment Wallet API
 * Get wallet balance and address
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPaymentWalletBalance, getPaymentWalletAddress } from '@/lib/storage/payment-wallets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const balance = await getPaymentWalletBalance(session.user.id);
    const address = await getPaymentWalletAddress(session.user.id);

    return NextResponse.json({
      address,
      balanceAPT: balance.balanceAPT,
      balanceOctas: balance.balanceOctas,
    });
  } catch (error: any) {
    console.error('Error fetching wallet:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch wallet' },
      { status: 500 }
    );
  }
}




