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
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start gap-4">
        {/* Agent Image */}
        <div className="w-16 h-16 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
          {agent.imageUrl ? (
            <Image
              src={agent.imageUrl}
              alt={agent.name}
              width={64}
              height={64}
              className="rounded-lg object-cover"
            />
          ) : (
            <div className="w-full h-full rounded-lg bg-zinc-800 flex items-center justify-center text-white text-2xl font-bold">
              {agent.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Agent Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-zinc-900 truncate">
                {agent.name}
              </h3>
              {agent.description && (
                <p className="text-sm text-zinc-600 mt-1 line-clamp-2">
                  {agent.description}
                </p>
              )}
            </div>
            <Badge variant={agent.visibility === 'public' ? 'default' : 'secondary'}>
              {agent.visibility}
            </Badge>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
            <div className="flex items-center gap-1">
              <Wallet className="w-3 h-3" />
              <span className="truncate max-w-[120px]">{agent.walletAddress.slice(0, 8)}...</span>
            </div>
            {balance !== undefined && (
              <div className="flex items-center gap-1">
                <span className="font-medium text-zinc-700">{balance} APT</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <span>{agent.apiIds.length} API{agent.apiIds.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4">
            <Link href={`/composer/${agent.id}`}>
              <Button size="sm" variant="default" className="bg-zinc-900 hover:bg-zinc-800 text-white">
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat
              </Button>
            </Link>
            <Link href={`/composer/${agent.id}/settings`}>
              <Button size="sm" variant="outline" className="border-zinc-300 text-white hover:bg-zinc-50">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </Link>
            {onDelete && (
              <Button
                size="sm"
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


