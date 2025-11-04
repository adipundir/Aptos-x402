'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChatInterface } from '@/components/composer/ChatInterface';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AgentChatPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.agentId as string;
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgent();
  }, [agentId]);

  const fetchAgent = async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}`);
      if (!res.ok) {
        router.push('/composer');
        return;
      }
      const data = await res.json();
      setAgent(data.agent);
    } catch (error) {
      console.error('Failed to fetch agent:', error);
      router.push('/composer');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-24 max-w-4xl flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!agent) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 max-w-6xl">
        <div className="mb-2 sm:mb-4">
          <Link href="/composer">
            <Button variant="ghost" size="sm" className="text-zinc-600 hover:text-zinc-900">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Agents
            </Button>
          </Link>
        </div>
      <ChatInterface
        agentId={agent.id}
        agentName={agent.name}
        walletAddress={agent.walletAddress}
        agentApiIds={agent.apiIds}
      />
      </div>
    </div>
  );
}

