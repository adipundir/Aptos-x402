import { NextRequest, NextResponse } from 'next/server';
import { getAgentById } from '@/lib/storage/agents';
import { getChatWithMessages } from '@/lib/storage/chats';

export const dynamic = 'force-dynamic';

// Helper to get userId from request
function getUserId(request: Request): string {
  const userId = request.headers.get('x-user-id') || 'default-user';
  return userId;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const userId = getUserId(request);
    const { agentId } = await params;
    
    const agent = await getAgentById(agentId, userId);
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Get chat history to calculate stats
    const chatData = await getChatWithMessages(agentId, userId);
    
    let totalRequests = 0;
    let totalSpent = 0;
    let apiCallsCount = 0;

    if (chatData) {
      // Count messages and calculate spending
      chatData.messages.forEach(msg => {
        if (msg.role === 'user') {
          totalRequests++;
        }
        
        // Check if an API was called and calculate cost
        if (msg.metadata?.apiCalled) {
          apiCallsCount++;
          
          // Extract actual payment amount from metadata (in Octas)
          if (msg.metadata.paymentAmount) {
            const amountInOctas = parseFloat(msg.metadata.paymentAmount);
            const amountInAPT = amountInOctas / 100_000_000; // Convert Octas to APT
            totalSpent += amountInAPT;
          }
        }
      });
    }
    
    // Log stats calculation (only in development for debugging)
    if (process.env.NODE_ENV === 'development') {
      console.log('[Stats] Calculated stats from historical messages (no new transactions):', {
        totalRequests,
        apiCallsCount,
        totalSpent,
        totalSpentUsd: totalSpent * 10
      });
    }

    // Convert APT to USD (approximate, would need real price feed)
    const aptToUsd = 10; // Example: 1 APT = $10
    const totalSpentUsd = totalSpent * aptToUsd;

    return NextResponse.json({
      stats: {
        requests: totalRequests,
        apiCalls: apiCallsCount,
        totalSpentAPT: totalSpent.toFixed(8),
        totalSpentUSD: totalSpentUsd.toFixed(2),
      },
    });
  } catch (error: any) {
    console.error('Error fetching agent stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
