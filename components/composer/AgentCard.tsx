'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, MessageSquare, Settings, Trash2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    visibility: 'public' | 'private';
    walletAddress: string;
    apiIds: string[];
    createdAt: string;
  };
  balance?: string;
  onDelete?: (id: string) => void;
}

export function AgentCard({ agent, balance, onDelete }: AgentCardProps) {
  return (
    <Card className="p-4 md:p-8 hover:shadow-lg transition-shadow w-full md:min-w-[500px]">
      <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6">
        {/* Agent Image */}
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
          {agent.imageUrl ? (
            <Image
              src={agent.imageUrl}
              alt={agent.name}
              width={80}
              height={80}
              className="rounded-lg object-cover"
            />
          ) : (
            <div className="w-full h-full rounded-lg bg-zinc-800 flex items-center justify-center text-white text-2xl md:text-3xl font-bold">
              {agent.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Agent Info */}
        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0 w-full">
              <h3 className="text-lg md:text-xl font-semibold text-zinc-900 truncate mb-2">
                {agent.name}
              </h3>
              {agent.description && (
                <p className="text-sm text-zinc-600 mt-2 line-clamp-2">
                  {agent.description}
                </p>
              )}
            </div>
            <Badge variant={agent.visibility === 'public' ? 'default' : 'secondary'} className="text-xs">
              {agent.visibility}
            </Badge>
          </div>

          {/* Metadata */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mt-4 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              <span className="truncate max-w-[150px]">{agent.walletAddress.slice(0, 10)}...</span>
            </div>
            {balance !== undefined && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-700">{balance} APT</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="font-medium">{agent.apiIds.length} API{agent.apiIds.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-4 md:mt-6">
            <Link href={`/composer/${agent.id}`} className="flex-1 sm:flex-initial">
              <Button size="default" variant="default" className="bg-zinc-900 hover:bg-zinc-800 text-white w-full sm:w-auto">
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat
              </Button>
            </Link>
            <Link href={`/composer/${agent.id}/settings`} className="flex-1 sm:flex-initial">
              <Button size="default" className="border-zinc-300 text-white w-full sm:w-auto">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </Link>
            {onDelete && (
              <Button
                size="default"
                variant="ghost"
                onClick={() => onDelete(agent.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}


