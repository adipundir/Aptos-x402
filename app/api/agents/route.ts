/**
 * Agents API
 * CRUD operations for agents with NextAuth authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllAgents, createAgent, getAgentForClient } from '@/lib/storage/agents';
import { getPaymentWalletAddress, getOrCreatePaymentWallet } from '@/lib/storage/payment-wallets';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') as 'mine' | 'public' | null;
    
    // Get agents based on scope
    const agents = await getAllAgents(scope || undefined, userId);
    
    // Return client-safe versions (without private keys)
    const clientSafeAgents = agents.map(getAgentForClient);
    
    // Cache public agents for 1 minute
    const headers = new Headers();
    if (scope === 'public') {
      headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    }
    
    return NextResponse.json({ agents: clientSafeAgents }, { headers });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to create agents.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();
    const { name, description, visibility, apiIds } = body;

    if (!name || !apiIds || !Array.isArray(apiIds)) {
      return NextResponse.json(
        { error: 'Missing required fields: name, apiIds' },
        { status: 400 }
      );
    }

    // Ensure payment wallet exists
    await getOrCreatePaymentWallet(userId);

    // Create agent (no wallet generation - uses shared payment wallet)
    const agent = await createAgent({
      userId,
      name,
      description,
      imageUrl: undefined,
      visibility: visibility || 'private',
      apiIds,
    });

    // Get payment wallet address to include in response
    const paymentWallet = await getPaymentWalletAddress(userId);

    // Return agent with payment wallet info
    return NextResponse.json({ 
      agent: {
        ...getAgentForClient(agent),
        paymentWallet,
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create agent' },
      { status: 500 }
    );
  }
}
