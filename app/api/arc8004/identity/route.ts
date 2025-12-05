/**
 * ARC-8004 Identity API
 * GET /api/arc8004/identity - Get identity by agentId
 * POST /api/arc8004/identity - Register new identity
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { IdentityRegistry } from '@/lib/arc8004/identity/registry';
import { createAgentCard, validateAgentCard } from '@/lib/arc8004/identity/agent-card';
import type { AgentCard } from '@/lib/arc8004/types';

/**
 * GET /api/arc8004/identity?agentId=xxx
 * Get agent identity by ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId query parameter is required' },
        { status: 400 }
      );
    }

    const registry = new IdentityRegistry();
    const identity = await registry.resolveIdentity(agentId);

    if (!identity) {
      return NextResponse.json(
        { error: 'Identity not found', agentId },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      identity,
    });
  } catch (error: any) {
    console.error('[ARC8004 Identity GET] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get identity' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/arc8004/identity
 * Register new agent identity
 * 
 * Body:
 * {
 *   agentId: string,
 *   agentCard?: AgentCard,
 *   // Or provide these to auto-create agent card:
 *   name?: string,
 *   description?: string,
 *   capabilities?: string[],
 *   protocols?: string[],
 *   supportedNetworks?: string[],
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      agentId, 
      agentCard: providedAgentCard,
      name,
      description,
      capabilities,
      protocols,
      supportedNetworks,
      ownerAddress,
      ownerPublicKey,
    } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      );
    }

    // Create or use provided agent card
    let agentCard: AgentCard;

    if (providedAgentCard) {
      // Validate provided agent card
      const validation = validateAgentCard(providedAgentCard);
      if (!validation.valid) {
        return NextResponse.json(
          { 
            error: 'Invalid agent card', 
            details: validation.errors 
          },
          { status: 400 }
        );
      }
      agentCard = providedAgentCard;
    } else {
      // Auto-create agent card from provided fields
      if (!name || !ownerAddress || !ownerPublicKey) {
        return NextResponse.json(
          { 
            error: 'Either provide agentCard or name, ownerAddress, and ownerPublicKey' 
          },
          { status: 400 }
        );
      }

      agentCard = createAgentCard({
        name,
        description: description || `Agent ${name}`,
        ownerAddress,
        ownerPublicKey,
        capabilities,
        protocols,
        supportedNetworks,
      });
    }

    // Register identity
    const registry = new IdentityRegistry();
    const result = await registry.registerIdentity({
      agentId,
      agentCard,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('[ARC8004 Identity POST] Error:', error);
    
    // Handle specific errors
    if (error.message?.includes('already exists')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to register identity' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/arc8004/identity
 * Update agent identity
 */
export async function PATCH(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { agentId, updates } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      );
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'updates object is required' },
        { status: 400 }
      );
    }

    const registry = new IdentityRegistry();
    const updatedIdentity = await registry.updateAgentCard(agentId, updates);

    return NextResponse.json({
      success: true,
      identity: updatedIdentity,
    });
  } catch (error: any) {
    console.error('[ARC8004 Identity PATCH] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update identity' },
      { status: 500 }
    );
  }
}

