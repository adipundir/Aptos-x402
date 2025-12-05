import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ComposerClient } from '@/components/composer/ComposerClient';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { getAgentSummariesForUser } from '@/lib/services/agent-summary';

export const dynamic = 'force-dynamic';

export default async function ComposerPage() {
  const session = await auth();
  
  // Redirect to sign in if not authenticated
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const userId = session.user.id;
  const agentSummaries = await getAgentSummariesForUser(userId);

  const serializedSummaries = agentSummaries.map(({ agent, balance, stats, trust, identity }) => ({
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
  }));

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-24 max-w-6xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1
              className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-2"
              style={{ fontFamily: 'Impact, "Arial Black", sans-serif' }}
            >
              Agent Composer
            </h1>
            <p className="text-sm sm:text-base text-zinc-600">
              Create and manage AI agents that can interact with x402-protected APIs
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

        <ComposerClient initialAgents={serializedSummaries} />
      </div>
    </div>
  );
}
