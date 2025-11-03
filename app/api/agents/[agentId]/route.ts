import { NextRequest, NextResponse } from 'next/server';
import { getAgentById, updateAgent, deleteAgent, getAgentForClient } from '@/lib/storage/agents';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const agent = getAgentById(agentId);
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ agent: getAgentForClient(agent) });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch agent' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const body = await request.json();
    const updated = updateAgent(agentId, body);
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ agent: getAgentForClient(updated) });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update agent' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const deleted = deleteAgent(agentId);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete agent' },
      { status: 500 }
    );
  }
}

