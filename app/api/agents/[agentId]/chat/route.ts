import { NextRequest, NextResponse } from 'next/server';
import { getAgentById } from '@/lib/storage/agents';
import { executeAgentQuery } from '@/lib/agent/executor';
import { addMessage, getChatWithMessages } from '@/lib/storage/chats';

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

    // Add user message to chat history
    await addMessage(agentId, userId, {
      role: 'user',
      content: message,
    });

    // Execute agent query with LLM and API options
    const response = await executeAgentQuery(agent, message, {
      llm: llm || 'gemini-2.5-flash',
      apiId: apiId || null,
    });

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

    // Add agent response to chat history
    await addMessage(agentId, userId, {
      role: 'agent',
      content: agentMessage,
      metadata: {
        apiCalled: response.apiCalled,
        paymentHash: response.paymentHash,
        error: response.error,
        llmUsed: response.llmUsed,
      },
    });

    // Get full chat history
    const chatData = await getChatWithMessages(agentId, userId);

    return NextResponse.json({
      success: response.success,
      message: agentMessage,
      data: response.data,
      chat: chatData ? {
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
      } : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to process chat message' },
      { status: 500 }
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

