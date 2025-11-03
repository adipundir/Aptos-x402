'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AgentCard } from '@/components/composer/AgentCard';
import { Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Agent {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  visibility: 'public' | 'private';
  walletAddress: string;
  apiIds: string[];
  createdAt: string;
}

export default function ComposerPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      setAgents(data.agents || []);
      
      // Fetch balances for all agents
      const balancePromises = (data.agents || []).map(async (agent: Agent) => {
        try {
          const balanceRes = await fetch(`/api/agents/${agent.id}/balance`);
          const balanceData = await balanceRes.json();
          return { id: agent.id, balance: balanceData.balanceAPT || '0.00000000' };
        } catch {
          return { id: agent.id, balance: '0.00000000' };
        }
      });
      
      const balanceResults = await Promise.all(balancePromises);
      const balanceMap: Record<string, string> = {};
      balanceResults.forEach(({ id, balance }) => {
        balanceMap[id] = balance;
      });
      setBalances(balanceMap);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchAgents();
      } else {
        alert('Failed to delete agent');
      }
    } catch (error) {
      alert('Failed to delete agent');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-6 py-24 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-zinc-900 mb-2" style={{ fontFamily: 'Impact, "Arial Black", sans-serif' }}>Agent Composer</h1>
            <p className="text-zinc-600">
              Create and manage AI agents that can interact with x402-protected APIs
            </p>
          </div>
          <Link href="/composer/create">
            <Button className="bg-zinc-900 hover:bg-zinc-800 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Agent
            </Button>
          </Link>
        </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-300 rounded-lg">
          <p className="text-zinc-600 mb-4">No agents yet. Create your first agent to get started!</p>
          <Link href="/composer/create">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Agent
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              balance={balances[agent.id]}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

