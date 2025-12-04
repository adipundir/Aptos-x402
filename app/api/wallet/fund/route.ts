/**
 * Fund Wallet API (Testnet only)
 * Request funds from faucet
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { fundWalletFromFaucet, getPaymentWalletBalance } from '@/lib/storage/payment-wallets';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await fundWalletFromFaucet(session.user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fund wallet' },
        { status: 400 }
      );
    }

    // Get updated balance
    const balance = await getPaymentWalletBalance(session.user.id);

    return NextResponse.json({
      success: true,
      balanceAPT: balance.balanceAPT,
      balanceOctas: balance.balanceOctas,
    });
  } catch (error: any) {
    console.error('Error funding wallet:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fund wallet' },
      { status: 500 }
    );
  }
}




