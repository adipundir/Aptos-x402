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
    <div className="fixed inset-0 top-16 flex flex-col overflow-hidden bg-zinc-50">
      <div className="flex-1 min-h-0 overflow-hidden">
        {loading ? (
          <div className="h-full min-h-0 overflow-hidden">
            <ChatInterfaceSkeleton />
          </div>
        ) : agent ? (
          <div className="h-full min-h-0 overflow-hidden">
            <ChatInterface
              agentId={agent.id}
              agentName={agent.name}
              walletAddress={agent.wallet?.address || ''}
              agentApiIds={agent.apiIds}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

