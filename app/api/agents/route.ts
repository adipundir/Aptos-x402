/**
 * Agents API
 * CRUD operations for agents with NextAuth authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAgentsWithWallets, createAgent, getAgentForClient } from '@/lib/storage/agents';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') as 'mine' | 'public' | null;
    
    // Get agents with wallet info based on scope
    const agents = await getAgentsWithWallets(scope || undefined, userId);
    
    // Return client-safe versions
    const clientSafeAgents = agents.map(getAgentForClient);
    
    // Cache public agents for 1 minute
    const headers = new Headers();
    if (scope === 'public') {
      headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    }
    
    return NextResponse.json({ agents: clientSafeAgents }, { headers });
  } catch (error: any) {
    console.error('Error fetching agents:', error);
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

    // Create agent with wallet
    const agent = await createAgent({
      userId,
      name,
      description,
      imageUrl: undefined,
      visibility: visibility || 'private',
      apiIds,
    });

    // Return agent with wallet info
    return NextResponse.json({ 
      agent: getAgentForClient(agent)
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create agent' },
      { status: 500 }
    );
  }
}
