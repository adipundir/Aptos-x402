/**
 * Admin Verify Agent API
 * Verify agent identity - admin only endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { IdentityRegistry } from '@/lib/arc8004/identity/registry';
import { Account } from '@aptos-labs/ts-sdk';
import { getAccountFromPrivateKey } from '@/lib/aptos-utils';
import { getAgentWalletPrivateKey } from '@/lib/storage/agent-wallets';
import { db } from '@/lib/db';
import { agents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Admin wallet address from environment variable
const ADMIN_WALLET_ADDRESS = process.env.ADMIN_WALLET_ADDRESS || '';

// Normalize address for comparison
function normalizeAddress(address: string): string {
  const lower = address.toLowerCase();
  return lower.startsWith('0x') ? lower : `0x${lower}`;
}

export async function POST(request: NextRequest) {
  try {
    // Check wallet-based authentication
    const walletAddress = request.headers.get('x-admin-wallet');
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
    }

    // Verify admin wallet
    const normalized = normalizeAddress(walletAddress);
    const adminNormalized = normalizeAddress(ADMIN_WALLET_ADDRESS);
    
    if (normalized !== adminNormalized) {
      return NextResponse.json({ error: 'Forbidden: Admin wallet required' }, { status: 403 });
    }

    const { agentId } = await request.json();
    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
    }

    // Verify the agent exists
    const agentResult = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
    if (agentResult.length === 0) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const registry = new IdentityRegistry();
    
    // Get agent's wallet for minting (if needed)
    let agentWalletSigner: Account | undefined;
    try {
      const agentWalletPrivateKey = await getAgentWalletPrivateKey(agentId);
      agentWalletSigner = getAccountFromPrivateKey(agentWalletPrivateKey);
      console.log(`[admin-verify] Agent wallet signer created: ${agentWalletSigner.accountAddress.toString()}`);
    } catch (error) {
      console.warn('[admin-verify] Failed to get agent wallet for minting:', error);
    }
    
    // Check if admin account is configured for on-chain verification
    let adminSigner: Account | undefined;
    const adminPrivateKey = process.env.ARC8004_ADMIN_PRIVATE_KEY;
    if (adminPrivateKey) {
      try {
        adminSigner = getAccountFromPrivateKey(adminPrivateKey);
        console.log(`[admin-verify] Admin signer created: ${adminSigner.accountAddress.toString()}`);
      } catch (error) {
        console.warn('[admin-verify] Failed to create admin account from ARC8004_ADMIN_PRIVATE_KEY:', error);
      }
    } else {
      console.warn('[admin-verify] ARC8004_ADMIN_PRIVATE_KEY not set - on-chain verification disabled');
    }

    // Use admin wallet address for verifiedBy field
    const result = await registry.verifyIdentity(agentId, walletAddress, adminSigner, agentWalletSigner);

    // Build success message
    let message = 'Identity verified by admin';
    if (result.mintTxHash && result.verifyTxHash) {
      message = `Identity minted and verified on-chain by admin. Mint: ${result.mintTxHash}, Verify: ${result.verifyTxHash}`;
    } else if (result.mintTxHash) {
      message = `Identity minted on-chain by admin. Transaction: ${result.mintTxHash}`;
    } else if (result.verifyTxHash) {
      message = `Identity verified on-chain by admin. Transaction: ${result.verifyTxHash}`;
    } else if (result.identity.tokenAddress) {
      message = 'Identity verified in database by admin (on-chain verification failed or not configured)';
    } else {
      message = 'Identity verified in database by admin (not minted on-chain yet)';
    }

    return NextResponse.json({ 
      success: true, 
      identity: result.identity,
      onChainVerified: !!(result.mintTxHash || result.verifyTxHash),
      mintTxHash: result.mintTxHash,
      verifyTxHash: result.verifyTxHash,
      message,
      verifiedBy: walletAddress,
    });
  } catch (error: any) {
    console.error('[admin-verify] Error verifying identity:', error);
    
    let errorMessage = error.message || 'Failed to verify identity';
    if (errorMessage.includes('Insufficient balance') || errorMessage.includes('INSUFFICIENT_BALANCE')) {
      errorMessage += '\n\nThe agent wallet needs APT for minting. Please fund the agent wallet first.';
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
