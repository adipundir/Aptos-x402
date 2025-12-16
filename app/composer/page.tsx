import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ComposerClient } from '@/components/composer/ComposerClient';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { getAgentSummariesForUser, type AgentSummary } from '@/lib/services/agent-summary';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function ComposerPage() {
  const session = await auth();
  
  // Redirect to sign in if not authenticated
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const userId = session.user.id;
  let agentSummaries: AgentSummary[] = [];
  let initialError: string | null = null;

  try {
    agentSummaries = await getAgentSummariesForUser(userId);
  } catch (error) {
    console.error('[ComposerPage] Failed to load agent summaries', error);
    initialError = 'Unable to load agents. Verify DATABASE_URL and database connectivity.';
  }

  const serializedSummaries = agentSummaries.map(({ agent, balance, stats, trust, identity, onChainScore }) => ({
    agent: {
      id: agent.id,
      userId: agent.userId,
      name: agent.name,
      description: agent.description ?? null,
      visibility: agent.visibility as 'public' | 'private',
      apiIds: agent.apiIds,
      wallet: agent.wallet ?? null,
      createdAt: agent.createdAt instanceof Date ? agent.createdAt.toISOString() : agent.createdAt,
      updatedAt: agent.updatedAt instanceof Date ? agent.updatedAt.toISOString() : agent.updatedAt ?? null,
    },
    balance,
    stats,
    trust: trust
      ? {
          ...trust,
        }
      : undefined,
    identity: identity
      ? {
          ...identity,
        }
      : undefined,
    onChainScore: onChainScore
      ? {
          ...onChainScore,
          lastUpdated: onChainScore.lastUpdated instanceof Date 
            ? onChainScore.lastUpdated.toISOString() 
            : onChainScore.lastUpdated,
        }
      : undefined,
  }));

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-24 max-w-6xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1
                className="text-3xl sm:text-4xl font-bold text-zinc-900"
                style={{ fontFamily: 'Impact, "Arial Black", sans-serif' }}
              >
                Agent Composer
              </h1>
              <Badge className="rounded-full bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
                Beta
              </Badge>
            </div>
            <p className="text-sm sm:text-base text-zinc-600">
              Create and manage AI agents that can interact with x402-protected APIs.
              <br />
              Beta release—features may change during testing.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Link href="/composer/create" className="w-full sm:w-auto">
              <Button className="bg-zinc-900 hover:bg-zinc-800 text-white w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Create Agent
              </Button>
            </Link>
          </div>
        </div>

        <ComposerClient initialAgents={serializedSummaries} initialError={initialError ?? undefined} />
      </div>
    </div>
  );
}
