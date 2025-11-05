import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAgentById } from '@/lib/storage/agents';
import { getAgentBalance } from '@/lib/services/agent-summary';
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

    const balance = await getAgentBalance(agent, userId);

    return NextResponse.json(balance);
  } catch (error: any) {
    console.error('Error fetching wallet balance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}
