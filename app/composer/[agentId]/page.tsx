'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChatInterface } from '@/components/composer/ChatInterface';
import { ChatInterfaceSkeleton } from '@/components/composer/ChatInterfaceSkeleton';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getUserIdHeaders } from '@/lib/utils/user-id';

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
      const res = await fetch(`/api/agents/${agentId}`, {
        headers: getUserIdHeaders(),
      });
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
        {loading ? (
          <ChatInterfaceSkeleton />
        ) : agent ? (
          <ChatInterface
            agentId={agent.id}
            agentName={agent.name}
            walletAddress={agent.walletAddress}
            agentApiIds={agent.apiIds}
          />
        ) : null}
      </div>
    </div>
  );
}

