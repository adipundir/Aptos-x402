import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAgentById } from '@/lib/storage/agents';
import { IdentityRegistry } from '@/lib/arc8004/identity/registry';

/**
 * Verify agent identity (marks verified in DB)
 * Note: This is a server-side verification flag. On-chain verification can be added
 * by wiring the Move `verify_identity` entry function with an admin key.
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
    const updated = await registry.verifyIdentity(agentId, session.user.id);

    return NextResponse.json({ success: true, identity: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to verify identity' },
      { status: 500 }
    );
  }
}

