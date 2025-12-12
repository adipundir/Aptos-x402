'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wallet, MessageSquare, Settings, Trash2, ShieldCheck, CheckCircle2, ExternalLink, Copy, AlertCircle } from 'lucide-react';
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
    identity?: {
      verified: boolean;
      tokenAddress?: string;
      ownerAddress?: string;
      capabilities?: string[];
    };
    trust?: {
      trustLevel: number;
      trustLabel: string;
      trustColor: string;
      averageScore: number;
      feedbackCount: number;
    };
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
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(agent.identity?.verified ?? false);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogContent, setDialogContent] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
    mintTxHash?: string;
    verifyTxHash?: string;
  } | null>(null);

  const handleVerify = async () => {
    if (verifying) return;
    setVerifying(true);
    try {
      const res = await fetch('/api/arc8004/identity/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to verify identity');
      }
      const data = await res.json();
      setVerified(true);
      
      // Show success dialog with transaction hashes if on-chain operations happened
      if (data.mintTxHash || data.verifyTxHash) {
        setDialogContent({
          type: 'success',
          title: 'Identity Verified On-Chain',
          message: 'Your agent identity has been successfully verified on the Aptos blockchain.',
          mintTxHash: data.mintTxHash,
          verifyTxHash: data.verifyTxHash,
        });
      } else {
        setDialogContent({
          type: 'success',
          title: 'Identity Verified',
          message: data.message || 'Identity verified in database only. On-chain verification not available.',
        });
      }
      setShowDialog(true);
    } catch (err) {
      console.error('Verify identity failed', err);
      setDialogContent({
        type: 'error',
        title: 'Verification Failed',
        message: err instanceof Error ? err.message : 'Failed to verify identity',
      });
      setShowDialog(true);
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getExplorerUrl = (txHash: string) => {
    const network = process.env.NEXT_PUBLIC_APTOS_NETWORK || 'aptos-testnet';
    const explorerNetwork = network.replace('aptos-', '');
    return `https://explorer.aptoslabs.com/txn/${txHash}?network=${explorerNetwork}`;
  };

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
              {(verified || agent.identity?.verified) && (
                <Badge className="rounded-md bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Verified
                </Badge>
              )}
              {agent.trust && (
                <Badge
                  style={{ backgroundColor: agent.trust.trustColor + '20', color: agent.trust.trustColor }}
                  className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
                >
                  {agent.trust.trustLabel} • {agent.trust.averageScore.toFixed(1)} / 5 ({agent.trust.feedbackCount})
                </Badge>
              )}
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
              {!(verified || agent.identity?.verified) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 border-emerald-200 bg-white px-4 font-medium text-emerald-700 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-50"
                  onClick={handleVerify}
                  disabled={verifying}
                >
                  <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                  {verifying ? 'Verifying…' : 'Verify'}
                </Button>
              )}
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

      {/* Verification Result Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[525px] bg-white text-zinc-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              {dialogContent?.type === 'success' ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  {dialogContent.title}
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  {dialogContent?.title || 'Verification Result'}
                </>
              )}
            </DialogTitle>
            <DialogDescription className="pt-1 text-sm text-zinc-600">
              {dialogContent?.message}
            </DialogDescription>
          </DialogHeader>
          
          {(dialogContent?.mintTxHash || dialogContent?.verifyTxHash) && (
            <div className="space-y-3 py-2">
              {dialogContent.mintTxHash && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 max-w-[477px]">
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Mint Transaction
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded bg-white px-3 py-2 text-[13px] font-mono text-zinc-800 shadow-inner">
                      {dialogContent.mintTxHash}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-zinc-600 hover:text-zinc-900"
                      onClick={() => copyToClipboard(dialogContent.mintTxHash!)}
                      title="Copy transaction hash"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-zinc-600 hover:text-zinc-900"
                      onClick={() => window.open(getExplorerUrl(dialogContent.mintTxHash!), '_blank')}
                      title="View on explorer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
              
              {dialogContent.verifyTxHash && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 max-w-[477px]">
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Verify Transaction
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded bg-white px-3 py-2 text-[13px] font-mono text-zinc-800 shadow-inner">
                      {dialogContent.verifyTxHash}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-zinc-600 hover:text-zinc-900"
                      onClick={() => copyToClipboard(dialogContent.verifyTxHash!)}
                      title="Copy transaction hash"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-zinc-600 hover:text-zinc-900"
                      onClick={() => window.open(getExplorerUrl(dialogContent.verifyTxHash!), '_blank')}
                      title="View on explorer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowDialog(false)} className="w-full sm:w-auto">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}


