'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, MessageSquare, Settings, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { getAgentIcon, getAgentGradient } from '@/lib/utils/agent-symbols';

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    description?: string;
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
    <Card className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:border-zinc-300 hover:shadow-lg lg:p-8">
      {/* Subtle gradient background on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-50/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        {/* Left Section: Agent Info */}
        <div className="flex flex-1 items-start gap-4 lg:gap-5">
          {/* Agent Icon */}
          <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-zinc-100 transition-transform duration-300 group-hover:scale-105 lg:h-16 lg:w-16">
            <div className={`flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br ${getAgentGradient(agent.id)} text-white shadow-inner`}>
              {(() => {
                const IconComponent = getAgentIcon(agent.id);
                return <IconComponent className="h-7 w-7 lg:h-8 lg:w-8" strokeWidth={2} />;
              })()}
            </div>
            {/* Small green dot for active status */}
            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
          </div>

          {/* Agent Details */}
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-bold tracking-tight text-zinc-900 lg:text-xl">
                {agent.name}
              </h3>
              <Badge 
                variant={agent.visibility === 'public' ? 'default' : 'secondary'} 
                className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              >
                {agent.visibility}
              </Badge>
            </div>
            
            {agent.description && (
              <p className="line-clamp-2 text-sm leading-relaxed text-zinc-600">
                {agent.description}
              </p>
            )}
            
            <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs">
              <Wallet className="h-3.5 w-3.5 text-zinc-400" />
              <span className="truncate font-mono text-zinc-700">{agent.walletAddress.slice(0, 18)}...</span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Link href={`/composer/${agent.id}`}>
                <Button size="sm" className="h-9 bg-zinc-900 px-4 font-medium text-white shadow-sm transition-all hover:bg-zinc-800 hover:shadow">
                  <MessageSquare className="mr-2 h-3.5 w-3.5 text-zinc-400" />
                  Chat
                </Button>
              </Link>
              <Link href={`/composer/${agent.id}/settings`}>
                <Button size="sm" variant="outline" className="h-9 border-zinc-200 bg-white px-4 font-medium text-zinc-700 shadow-sm transition-all hover:border-zinc-300 hover:bg-zinc-50">
                  <Settings className="mr-2 h-3.5 w-3.5 text-zinc-400" />
                  Settings
                </Button>
              </Link>
              {onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(agent.id)}
                  className="h-9 text-zinc-600 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Metrics */}
        <div className="w-full lg:w-auto lg:min-w-[360px]">
          <div className="flex overflow-hidden rounded-xl border border-zinc-200/80 bg-gradient-to-br from-white to-zinc-50/50 shadow-sm">
            {/* Requests */}
            <div className="flex flex-1 flex-col gap-1.5 px-4 py-4 transition-colors hover:bg-white lg:px-5 lg:py-5">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                <MessageSquare className="h-3 w-3 text-zinc-400" />
                Requests
              </span>
              <span className="text-2xl font-bold leading-none text-zinc-900">
                {stats?.requests || 0}
              </span>
            </div>

            <div className="w-px bg-zinc-200/60" />

            {/* Balance */}
            <div className="flex flex-1 flex-col gap-1.5 px-4 py-4 transition-colors hover:bg-white lg:px-5 lg:py-5">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                <Wallet className="h-3 w-3 text-zinc-400" />
                Balance
              </span>
              <span className="text-2xl font-bold leading-none text-zinc-900">
                {balance ? `${parseFloat(balance).toFixed(4)}` : '0.0000'}
                <span className="ml-1 text-xs font-semibold text-zinc-500">APT</span>
              </span>
            </div>

            <div className="w-px bg-zinc-200/60" />

            {/* APIs */}
            <div className="flex flex-1 flex-col gap-1.5 px-4 py-4 transition-colors hover:bg-white lg:px-5 lg:py-5">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                <svg className="h-3 w-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                APIs
              </span>
              <span className="text-2xl font-bold leading-none text-zinc-900">{agent.apiIds.length}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}


