import { NextRequest, NextResponse } from 'next/server';
import { getAllAgents, createAgent, getAgentForClient } from '@/lib/storage/agents';
import { generateAgentWallet } from '@/lib/agent/wallet';

export const dynamic = 'force-dynamic';

// Helper to get userId from request (can be extended with auth later)
function getUserId(request: Request): string {
  // For now, use a default userId or extract from headers/cookies
  // TODO: Replace with actual authentication logic
  const userId = request.headers.get('x-user-id') || 'default-user';
  return userId;
}

export async function GET(request: Request) {
  try {
    const userId = getUserId(request);
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
    const userId = getUserId(request);
    const body = await request.json();
    const { name, description, imageUrl, visibility, apiIds } = body;

    if (!name || !apiIds || !Array.isArray(apiIds)) {
      return NextResponse.json(
        { error: 'Missing required fields: name, apiIds' },
        { status: 400 }
      );
    }

    // Generate wallet for the agent
    const { address, privateKey } = generateAgentWallet();

    // Create agent
    const agent = await createAgent({
      userId,
      name,
      description,
      imageUrl,
      visibility: visibility || 'private',
      walletAddress: address,
      privateKey,
      apiIds,
    });

    // Return client-safe version
    return NextResponse.json({ agent: getAgentForClient(agent) }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create agent' },
      { status: 500 }
    );
  }
}


