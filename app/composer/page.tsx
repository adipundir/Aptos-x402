'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AgentCard } from '@/components/composer/AgentCard';
import { AgentCardSkeleton } from '@/components/composer/AgentCardSkeleton';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { getUserIdHeaders } from '@/lib/utils/user-id';

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

interface AgentStats {
  requests: number;
  apiCalls: number;
  totalSpentAPT: string;
  totalSpentUSD: string;
}

export default function ComposerPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<Record<string, AgentStats>>({});

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      // Fetch agents with user ID header
      const res = await fetch('/api/agents', {
        headers: getUserIdHeaders(),
      });
      const data = await res.json();
      setAgents(data.agents || []);
      
      // Fetch balances and stats for all agents in parallel
      const dataPromises = (data.agents || []).map(async (agent: Agent) => {
        try {
          const [balanceRes, statsRes] = await Promise.all([
            fetch(`/api/agents/${agent.id}/balance`, {
              headers: getUserIdHeaders(),
            }),
            fetch(`/api/agents/${agent.id}/stats`, {
              headers: getUserIdHeaders(),
            }),
          ]);
          
          const balanceData = await balanceRes.json();
          const statsData = await statsRes.json();
          
          return { 
            id: agent.id, 
            balance: balanceData.balanceAPT || '0.00000000',
            stats: statsData.stats || {
              requests: 0,
              apiCalls: 0,
              totalSpentAPT: '0.00000000',
              totalSpentUSD: '0.00'
            }
          };
        } catch {
          return { 
            id: agent.id, 
            balance: '0.00000000',
            stats: {
              requests: 0,
              apiCalls: 0,
              totalSpentAPT: '0.00000000',
              totalSpentUSD: '0.00'
            }
          };
        }
      });
      
      const results = await Promise.all(dataPromises);
      const balanceMap: Record<string, string> = {};
      const statsMap: Record<string, AgentStats> = {};
      
      results.forEach(({ id, balance, stats }) => {
        balanceMap[id] = balance;
        statsMap[id] = stats;
      });
      
      setBalances(balanceMap);
      setStats(statsMap);
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
        headers: getUserIdHeaders(),
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
      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-24 max-w-6xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-2" style={{ fontFamily: 'Impact, "Arial Black", sans-serif' }}>Agent Composer</h1>
            <p className="text-sm sm:text-base text-zinc-600">
              Create and manage AI agents that can interact with x402-protected APIs
            </p>
          </div>
          <Link href="/composer/create" className="w-full sm:w-auto">
            <Button className="bg-zinc-900 hover:bg-zinc-800 text-white w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Create Agent
            </Button>
          </Link>
        </div>

      {loading ? (
        <div className="space-y-6">
          <AgentCardSkeleton />
          <AgentCardSkeleton />
          <AgentCardSkeleton />
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
        <div className="space-y-6">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              balance={balances[agent.id]}
              stats={stats[agent.id]}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

