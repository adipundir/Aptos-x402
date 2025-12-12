import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAgentById } from '@/lib/storage/agents';
import { IdentityRegistry } from '@/lib/arc8004/identity/registry';
import { Account } from '@aptos-labs/ts-sdk';
import { getAccountFromPrivateKey } from '@/lib/aptos-utils';
import { getAgentWalletPrivateKey } from '@/lib/storage/agent-wallets';

/**
 * Verify agent identity (marks verified in DB and optionally on-chain)
 * On-chain verification requires ARC8004_ADMIN_PRIVATE_KEY to be set
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agentId } = await request.json();
    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
    }

    // Ensure the agent exists and belongs to the user (or is public)
    const agent = await getAgentById(agentId, session.user.id);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const registry = new IdentityRegistry();
    
    // Get agent's wallet for minting (if needed)
    let agentWalletSigner: Account | undefined;
    try {
      const agentWalletPrivateKey = await getAgentWalletPrivateKey(agentId);
      agentWalletSigner = getAccountFromPrivateKey(agentWalletPrivateKey);
      console.log(`[verify] Agent wallet signer created: ${agentWalletSigner.accountAddress.toString()}`);
    } catch (error) {
      console.warn('[verify] Failed to get agent wallet for minting:', error);
      // Continue without agent wallet - will only work if identity is already minted
    }
    
    // Check if admin account is configured for on-chain verification
    let adminSigner: Account | undefined;
    const adminPrivateKey = process.env.ARC8004_ADMIN_PRIVATE_KEY;
    if (adminPrivateKey) {
      try {
        adminSigner = getAccountFromPrivateKey(adminPrivateKey);
        console.log(`[verify] Admin signer created: ${adminSigner.accountAddress.toString()}`);
      } catch (error) {
        console.warn('[verify] Failed to create admin account from ARC8004_ADMIN_PRIVATE_KEY:', error);
      }
    } else {
      console.warn('[verify] ARC8004_ADMIN_PRIVATE_KEY not set - on-chain verification disabled');
    }

    const result = await registry.verifyIdentity(agentId, session.user.id, adminSigner, agentWalletSigner);

    // Build success message
    let message = 'Identity verified';
    if (result.mintTxHash && result.verifyTxHash) {
      message = `Identity minted and verified on-chain. Mint: ${result.mintTxHash}, Verify: ${result.verifyTxHash}`;
    } else if (result.mintTxHash) {
      message = `Identity minted on-chain. Transaction: ${result.mintTxHash}`;
    } else if (result.verifyTxHash) {
      message = `Identity verified on-chain. Transaction: ${result.verifyTxHash}`;
    } else if (result.identity.tokenAddress) {
      message = 'Identity verified in database only (on-chain verification failed or not configured)';
    } else {
      message = 'Identity verified in database only (not minted on-chain yet)';
    }

    return NextResponse.json({ 
      success: true, 
      identity: result.identity,
      onChainVerified: !!(result.mintTxHash || result.verifyTxHash),
      mintTxHash: result.mintTxHash,
      verifyTxHash: result.verifyTxHash,
      message,
    });
  } catch (error: any) {
    console.error('[verify] Error verifying identity:', error);
    
    // Provide helpful error message for insufficient balance
    let errorMessage = error.message || 'Failed to verify identity';
    if (errorMessage.includes('Insufficient balance') || errorMessage.includes('INSUFFICIENT_BALANCE')) {
      errorMessage += '\n\nTo fix this:\n1. Go to Agent Settings\n2. Click "Fund Agent" button\n3. Send at least 0.0001 APT to the agent wallet\n4. Try verifying again';
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}










