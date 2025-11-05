import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAgentById, updateAgent, deleteAgent, getAgentForClient } from '@/lib/storage/agents';
import { USER_ID_COOKIE } from '@/lib/utils/user-id';

export const dynamic = 'force-dynamic';

async function getUserId(request: Request): Promise<string> {
  // Try cookie first (preferred method), then fall back to header
  const cookieStore = await cookies();
  const userIdFromCookie = cookieStore.get(USER_ID_COOKIE)?.value;
  if (userIdFromCookie) {
    return userIdFromCookie;
  }
  return request.headers.get('x-user-id') || 'default-user';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const userId = await getUserId(request);
    const { agentId } = await params;
    const agent = await getAgentById(agentId, userId);
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
    const userId = await getUserId(request);
    const { agentId } = await params;
    const body = await request.json();
    const updated = await updateAgent(agentId, body, userId);
    
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
    const userId = await getUserId(request);
    const { agentId } = await params;
    const deleted = await deleteAgent(agentId, userId);
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

