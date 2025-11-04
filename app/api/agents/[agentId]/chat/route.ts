import { NextRequest, NextResponse } from 'next/server';
import { getAgentById } from '@/lib/storage/agents';
import { executeAgentQuery } from '@/lib/agent/executor';
import { addMessage, getChatWithMessages } from '@/lib/storage/chats';
import { getOrCreateUserWallet } from '@/lib/storage/user-wallets';

export const dynamic = 'force-dynamic';

// Helper to get userId from request (can be extended with auth later)
function getUserId(request: Request): string {
  // For now, use a default userId or extract from headers/cookies
  // TODO: Replace with actual authentication logic
  const userId = request.headers.get('x-user-id') || 'default-user';
  return userId;
}

export async function POST(
  request: NextRequest,
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

    const body = await request.json();
    const { message, llm, apiId } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Determine which wallet to use for payment (do this in parallel with user message write)
    // - If user owns the agent (userId matches): use agent's wallet (even if public)
    // - If public agent used by someone else: use user's wallet
    // - If private agent: always use agent's wallet (only owner can access)
    let userPrivateKey: string | undefined;
    const isOwner = agent.userId === userId;
    
    // Start user message write in background (don't wait for it)
    const userMessagePromise = addMessage(agentId, userId, {
      role: 'user',
      content: message,
    });
    
    // Fetch user wallet in parallel if needed
    let walletPromise: Promise<void> | undefined;
    if (agent.visibility === 'public' && !isOwner) {
      walletPromise = getOrCreateUserWallet(userId).then(wallet => {
        userPrivateKey = wallet.privateKey;
      });
    }
    
    // Wait for wallet if needed, then execute query
    if (walletPromise) {
      await walletPromise;
    }
    // If owner or private agent: userPrivateKey stays undefined, executor will use agent's wallet

    // Execute agent query with LLM and API options (this is the main bottleneck)
    const response = await executeAgentQuery(agent, message, {
      llm: llm || 'gemini-2.5-flash',
      apiId: apiId || null,
    }, userPrivateKey);

    // Format agent response message
    let agentMessage = response.message;
    
    // If LLM was used for extraction, don't append raw JSON - LLM already formatted it
    // Only append raw JSON if:
    // 1. No LLM was used (keyword fallback mode)
    // 2. Message looks like a generic fallback message
    // 3. Message is very short and doesn't contain the actual answer
    if (response.success && response.data && response.apiCalled && !response.llmUsed) {
      const messageLower = response.message.toLowerCase();
      const isGenericMessage = messageLower.includes('successfully retrieved') ||
                               messageLower.includes('here\'s the data') ||
                               messageLower.includes('data from');
      
      // Only append JSON for keyword fallback mode when message is generic
      if (isGenericMessage || response.message.length < 50) {
        agentMessage = `${response.message}\n\n${JSON.stringify(response.data, null, 2)}`;
      }
    }
    // If LLM was used, trust its extraction - don't append raw data

    // Return response immediately, save agent message in background
    // This significantly improves perceived performance
    const responsePayload = {
      success: response.success,
      message: agentMessage,
      data: response.data,
      apiCalled: response.apiCalled,
      paymentHash: response.paymentHash,
      paymentAmount: response.paymentAmount,
      llmUsed: response.llmUsed,
    };

    // If there's an error (like insufficient balance), return it immediately
    if (!response.success && response.error) {
      // Still save the agent message in background for history
      addMessage(agentId, userId, {
        role: 'agent',
        content: agentMessage,
        metadata: {
          apiCalled: response.apiCalled,
          paymentHash: response.paymentHash,
          paymentAmount: response.paymentAmount,
          error: response.error,
          llmUsed: response.llmUsed,
        },
      }).catch(err => console.error('Failed to save error message:', err));
      
      return NextResponse.json({
        success: false,
        error: response.error,
        message: response.message,
      }, { status: 400 });
    }

    // Save agent message in background (don't wait for it)
    const agentMessagePromise = addMessage(agentId, userId, {
      role: 'agent',
      content: agentMessage,
      metadata: {
        apiCalled: response.apiCalled,
        paymentHash: response.paymentHash,
        paymentAmount: response.paymentAmount,
        error: response.error,
        llmUsed: response.llmUsed,
      },
    });

    // Return response immediately - chat history can be fetched separately via GET
    // This reduces response time by ~100-500ms (depending on DB latency)
    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('Error processing chat message:', error);
    
    // Check if it's a balance-related error
    const errorMessage = error.message || String(error);
    const isBalanceError = errorMessage.includes('INSUFFICIENT_BALANCE') || 
                          errorMessage.includes('insufficient');
    
    return NextResponse.json(
      { 
        success: false,
        error: isBalanceError ? 'INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE' : 'EXECUTION_ERROR',
        message: errorMessage 
      },
      { status: isBalanceError ? 400 : 500 }
    );
  }
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

    const chatData = await getChatWithMessages(agentId, userId);
    if (!chatData) {
      return NextResponse.json({ 
        chat: {
          id: null,
          agentId,
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      });
    }

    return NextResponse.json({ 
      chat: {
        id: chatData.thread.id,
        agentId: chatData.thread.agentId,
        messages: chatData.messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          metadata: msg.metadata,
        })),
        createdAt: chatData.thread.createdAt,
        updatedAt: chatData.thread.updatedAt,
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch chat' },
      { status: 500 }
    );
  }
}

