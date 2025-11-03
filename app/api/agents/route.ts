import { NextRequest, NextResponse } from 'next/server';
import { getAllAgents, createAgent, getAgentForClient } from '@/lib/storage/agents';
import { generateAgentWallet } from '@/lib/agent/wallet';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const agents = getAllAgents();
    // Return client-safe versions (without private keys)
    const clientSafeAgents = agents.map(getAgentForClient);
    return NextResponse.json({ agents: clientSafeAgents });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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
    const agent = createAgent({
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


