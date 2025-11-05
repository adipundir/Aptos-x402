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
  stats?: {
    requests: number;
    apiCalls: number;
    totalSpentAPT: string;
    totalSpentUSD: string;
  };
  onDelete?: (id: string) => void;
}

export function AgentCard({ agent, balance, stats, onDelete }: AgentCardProps) {
  return (
    <Card className="p-6 lg:p-8 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow w-full">
      <div className="flex flex-col lg:flex-row items-start justify-between gap-8">
        {/* Left Section: Agent Info */}
        <div className="flex items-start gap-5 flex-1 w-full">
          {/* Agent Image */}
          <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0 shadow-inner">
            {agent.imageUrl ? (
              <Image
                src={agent.imageUrl}
                alt={agent.name}
                width={80}
                height={80}
                className="rounded-xl object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-2xl font-semibold">
                {agent.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Agent Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-lg lg:text-xl font-semibold text-zinc-900">
                {agent.name}
              </h3>
              <Badge variant={agent.visibility === 'public' ? 'default' : 'secondary'} className="text-[11px] tracking-wide uppercase">
                {agent.visibility}
              </Badge>
            </div>
            {agent.description && (
              <p className="text-sm text-zinc-600 mb-4 line-clamp-2">
                {agent.description}
              </p>
            )}
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Wallet className="w-4 h-4" />
              <span className="truncate font-medium text-zinc-700">{agent.walletAddress.slice(0, 16)}...</span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 mt-5">
              <Link href={`/composer/${agent.id}`}>
                <Button size="sm" variant="default" className="bg-zinc-900 hover:bg-zinc-800 text-white px-4">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Chat
                </Button>
              </Link>
              <Link href={`/composer/${agent.id}/settings`}>
                <Button size="sm" className="border-zinc-300 text-white px-4">
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

        {/* Right Section: Metrics */}
        <div className="w-full lg:w-auto lg:min-w-[360px]">
          <div className="border border-zinc-200 rounded-xl bg-zinc-50/40 flex flex-col sm:flex-row overflow-hidden divide-y divide-zinc-200 sm:divide-y-0 sm:divide-x">
            {/* Requests */}
            <div className="flex-1 px-5 py-4 sm:py-5 flex flex-col gap-1">
              <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                <MessageSquare className="w-3.5 h-3.5" />
                Requests
              </span>
              <span className="text-2xl font-semibold text-zinc-900 leading-tight">
                {stats?.requests || 0}
              </span>
            </div>

            <div className="flex-1 px-5 py-4 sm:py-5 flex flex-col gap-1">
              <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                <Wallet className="w-3.5 h-3.5" />
                Balance
              </span>
              <span className="text-2xl font-semibold text-zinc-900 leading-tight">
                {balance ? `${parseFloat(balance).toFixed(4)}` : '0.0000'}
                <span className="text-sm font-medium text-zinc-500 ml-1">APT</span>
              </span>
            </div>
            <div className="flex-1 px-5 py-4 sm:py-5 flex flex-col gap-1">
              <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                APIs
              </span>
              <span className="text-2xl font-semibold text-zinc-900 leading-tight">{agent.apiIds.length}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}


