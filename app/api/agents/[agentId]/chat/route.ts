/**
 * Agent Chat API
 * Handle chat messages and agent execution with NextAuth authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAgentById } from '@/lib/storage/agents';
import { executeAgentQuery } from '@/lib/agent/executor';
import { addMessage, getChatWithMessages } from '@/lib/storage/chats';
import { getAgentWalletPrivateKey } from '@/lib/storage/agent-wallets';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  let agentId: string | undefined;
  let userId: string | undefined;
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to chat with agents.' },
        { status: 401 }
      );
    }

    userId = session.user.id;
    const resolved = await params;
    agentId = resolved.agentId;
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

    // Check if user owns the agent or if it's public
    const isOwner = agent.userId === userId;
    
    // Start user message write in background (don't wait for it)
    addMessage(agentId, userId, {
      role: 'user',
      content: message,
    }).catch(err => console.error('Failed to save user message:', err));
    
    // Get agent's wallet private key (each agent has its own wallet)
    let paymentPrivateKey: string;
    try {
      paymentPrivateKey = await getAgentWalletPrivateKey(agentId);
      console.log(`[Agent Chat] Retrieved wallet private key for agent ${agentId}`);
    } catch (error: any) {
      console.error(`[Agent Chat] Failed to get wallet for agent ${agentId}:`, error);
      return NextResponse.json({
        success: false,
        error: 'WALLET_NOT_FOUND',
        message: `Agent wallet not found. Error: ${error.message || 'Unknown error'}. Please ensure the agent was created properly.`,
      }, { status: 400 });
    }

    // Execute agent query with the agent's wallet
    const response = await executeAgentQuery(agent, message, {
      llm: llm || 'gemini-2.5-flash',
      apiId: apiId || null,
    }, paymentPrivateKey);

    // Format agent response message
    let agentMessage = response.message;
    
    // If LLM was used for extraction, don't append raw JSON
    if (response.success && response.data && response.apiCalled && !response.llmUsed) {
      const messageLower = response.message.toLowerCase();
      const isGenericMessage = messageLower.includes('successfully retrieved') ||
                               messageLower.includes('here\'s the data') ||
                               messageLower.includes('data from');
      
      if (isGenericMessage || response.message.length < 50) {
        agentMessage = `${response.message}\n\n${JSON.stringify(response.data, null, 2)}`;
      }
    }

    const responsePayload = {
      success: response.success,
      message: agentMessage,
      data: response.data,
      apiCalled: response.apiCalled,
      paymentHash: response.paymentHash,
      paymentAmount: response.paymentAmount,
      llmUsed: response.llmUsed,
    };

    // If there's an error, return it immediately
    if (!response.success && response.error) {
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

    // Save agent message in background
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
    }).catch(err => console.error('Failed to save agent message:', err));

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('[Agent Chat] Error processing chat message:', error);
    console.error('[Agent Chat] Error stack:', error.stack);
    console.error('[Agent Chat] Error details:', {
      agentId: agentId ?? 'unknown',
      userId: userId ?? 'unknown',
      errorType: error.constructor?.name,
      errorMessage: error.message,
    });
    
    const errorMessage = error.message || String(error);
    const isBalanceError = errorMessage.includes('INSUFFICIENT_BALANCE') || 
                          errorMessage.includes('insufficient');
    const isWalletError = errorMessage.includes('WALLET_NOT_FOUND') ||
                         errorMessage.includes('wallet not found') ||
                         errorMessage.includes('ENCRYPTION_KEY');
    
    return NextResponse.json(
      { 
        success: false,
        error: isBalanceError ? 'INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE' : 
               isWalletError ? 'WALLET_ERROR' : 'EXECUTION_ERROR',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: isBalanceError || isWalletError ? 400 : 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  let agentId: string | undefined;
  let userId: string | undefined;
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    userId = session.user.id;
    const resolved = await params;
    agentId = resolved.agentId;
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
      { 
        error: error.message || 'Failed to fetch chat',
        details: process.env.NODE_ENV === 'development' ? { agentId, userId } : undefined,
      },
      { status: 500 }
    );
  }
}
