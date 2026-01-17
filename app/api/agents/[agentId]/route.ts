import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { getAgentByIdWithWallet, updateAgent, deleteAgent, getAgentForClient } from '@/lib/storage/agents';
import { USER_ID_COOKIE } from '@/lib/utils/user-id';

export const dynamic = 'force-dynamic';

async function getUserId(request: Request): Promise<string> {
  // Prefer authenticated user
  try {
    const session = await auth();
    if (session?.user?.id) {
      return session.user.id;
    }
  } catch {
    // ignore auth errors and fallback
  }

  // Fallback to cookie/header
  const cookieStore = await cookies();
  const userIdFromCookie = cookieStore.get(USER_ID_COOKIE)?.value;
  if (userIdFromCookie) {
    return userIdFromCookie;
  }
  return request.headers.get('user-id') || 'default-user';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const userId = await getUserId(request);
    const { agentId } = await params;
    // Use getAgentByIdWithWallet to include wallet info
    const agent = await getAgentByIdWithWallet(agentId, userId);
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

