/**
 * Admin Agents API
 * Get all agents with their identity/verification status for admin management
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { agents, agentIdentities, agentWallets, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

// Admin wallet address from environment variable
const ADMIN_WALLET_ADDRESS = process.env.ADMIN_WALLET_ADDRESS || '';

// Normalize address for comparison
function normalizeAddress(address: string): string {
  const lower = address.toLowerCase();
  return lower.startsWith('0x') ? lower : `0x${lower}`;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check wallet-based authentication
    const walletAddress = request.headers.get('admin-wallet');
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
    }

    // Verify admin wallet
    const normalized = normalizeAddress(walletAddress);
    const adminNormalized = normalizeAddress(ADMIN_WALLET_ADDRESS);
    
    if (normalized !== adminNormalized) {
      return NextResponse.json({ error: 'Forbidden: Admin wallet required' }, { status: 403 });
    }

    // Get all agents with their identities, wallets, and owner info
    const allAgents = await db
      .select({
        agent: agents,
        identity: agentIdentities,
        wallet: {
          address: agentWallets.walletAddress,
          publicKey: agentWallets.publicKey,
        },
        owner: {
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
        },
      })
      .from(agents)
      .leftJoin(agentIdentities, eq(agents.id, agentIdentities.agentId))
      .leftJoin(agentWallets, eq(agents.id, agentWallets.agentId))
      .leftJoin(users, eq(agents.userId, users.id))
      .orderBy(desc(agents.createdAt));

    // Transform to a cleaner format
    const agentsWithDetails = allAgents.map((row) => ({
      id: row.agent.id,
      name: row.agent.name,
      description: row.agent.description,
      visibility: row.agent.visibility,
      apiIds: row.agent.apiIds,
      createdAt: row.agent.createdAt,
      updatedAt: row.agent.updatedAt,
      owner: row.owner,
      wallet: row.wallet,
      identity: row.identity ? {
        id: row.identity.id,
        verified: row.identity.verified,
        verifiedAt: row.identity.verifiedAt,
        verifiedBy: row.identity.verifiedBy,
        tokenAddress: row.identity.tokenAddress,
        mintTransactionHash: row.identity.mintTransactionHash,
        agentCard: row.identity.agentCard,
      } : null,
    }));

    // Separate into verified and unverified
    const verified = agentsWithDetails.filter(a => a.identity?.verified);
    const unverified = agentsWithDetails.filter(a => !a.identity?.verified);

    return NextResponse.json({
      success: true,
      stats: {
        total: agentsWithDetails.length,
        verified: verified.length,
        unverified: unverified.length,
      },
      agents: agentsWithDetails,
    });
  } catch (error: any) {
    console.error('[Admin Agents] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}
