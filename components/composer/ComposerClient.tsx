'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AgentCard } from './AgentCard';
import { Button } from '@/components/ui/button';
import { Plus, Mail } from 'lucide-react';
import { getUserIdHeaders } from '@/lib/utils/user-id';
import { WaitlistModal } from './WaitlistModal';
import type { AgentBalanceSummary, AgentStatsSummary } from '@/lib/services/agent-summary';

interface SerializableAgent {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  visibility: 'public' | 'private';
  walletAddress: string;
  apiIds: string[];
  createdAt: string;
  updatedAt?: string | null;
}

interface SerializableAgentSummary {
  agent: SerializableAgent;
  balance: AgentBalanceSummary;
  stats: AgentStatsSummary;
}

interface ComposerClientProps {
  initialAgents: SerializableAgentSummary[];
}

export function ComposerClient({ initialAgents }: ComposerClientProps) {
  const [agents, setAgents] = useState<SerializableAgentSummary[]>(initialAgents);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);

  const handleDelete = async (agentId: string) => {
    if (deletingId) {
      return;
    }

    if (!confirm('Are you sure you want to delete this agent?')) {
      return;
    }

    setDeletingId(agentId);
    setError(null);

    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE',
        headers: getUserIdHeaders(),
      });

      if (!res.ok) {
        throw new Error('Failed to delete agent');
      }

      setAgents((prev) => prev.filter(({ agent }) => agent.id !== agentId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete agent';
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleWaitlistSuccess = () => {
    setWaitlistSuccess(true);
    setTimeout(() => setWaitlistSuccess(false), 3000);
  };

  if (agents.length === 0) {
    return (
      <div className="space-y-6">
        {error && (
          <div className="border border-red-200 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        {waitlistSuccess && (
          <div className="border border-green-200 bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">
            Successfully added to waitlist!
          </div>
        )}
        <div className="text-center py-12 border border-dashed border-zinc-300 rounded-lg">
          <p className="text-zinc-600 mb-4">No agents yet. Create your first agent to get started!</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link href="/composer/create">
              <Button className="bg-zinc-900 hover:bg-zinc-800 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Agent
              </Button>
            </Link>
            <Button
              onClick={() => setShowWaitlistModal(true)}
              variant="outline"
              className="border-zinc-300 hover:bg-zinc-50"
            >
              <Mail className="w-4 h-4 mr-2" />
              Get Your API Listed - Join the Waitlist
            </Button>
          </div>
        </div>
        {showWaitlistModal && (
          <WaitlistModal
            onClose={() => setShowWaitlistModal(false)}
            onSuccess={handleWaitlistSuccess}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="border border-red-200 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {waitlistSuccess && (
        <div className="border border-green-200 bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">
          Successfully added to waitlist!
        </div>
      )}
      <div className="flex justify-end">
            <Button
              onClick={() => setShowWaitlistModal(true)}
              variant="outline"
              className="border-zinc-300 hover:bg-zinc-50"
            >
              <Mail className="w-4 h-4 mr-2" />
              Get Your API Listed - Join the Waitlist
            </Button>
      </div>
      {agents.map(({ agent, balance, stats }) => {
        const normalizedAgent = {
          id: agent.id,
          name: agent.name,
          description: agent.description ?? undefined,
          imageUrl: agent.imageUrl ?? undefined,
          visibility: agent.visibility,
          walletAddress: agent.walletAddress,
          apiIds: agent.apiIds,
          createdAt: agent.createdAt,
        };

        return (
          <AgentCard
            key={agent.id}
            agent={normalizedAgent}
            balance={balance.balanceAPT}
            stats={stats}
            onDelete={handleDelete}
          />
        );
      })}
      {showWaitlistModal && (
        <WaitlistModal
          onClose={() => setShowWaitlistModal(false)}
          onSuccess={handleWaitlistSuccess}
        />
      )}
    </div>
  );
}
