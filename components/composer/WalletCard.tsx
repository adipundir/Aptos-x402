'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Copy, Check, ExternalLink, Loader2 } from 'lucide-react';

interface WalletCardProps {
  address: string | null;
  balanceAPT: string;
}

export function WalletCard({ address, balanceAPT: initialBalance }: WalletCardProps) {
  const [copied, setCopied] = useState(false);
  const [funding, setFunding] = useState(false);
  const [balance, setBalance] = useState(initialBalance);
  const [error, setError] = useState<string | null>(null);

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  const fundFromFaucet = async () => {
    setFunding(true);
    setError(null);
    try {
      const res = await fetch('/api/wallet/fund', { method: 'POST' });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fund wallet');
      }
      
      setBalance(data.balanceAPT);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFunding(false);
    }
  };

  const refreshBalance = async () => {
    try {
      const res = await fetch('/api/wallet');
      const data = await res.json();
      if (res.ok) {
        setBalance(data.balanceAPT);
      }
    } catch (err) {
      console.error('Failed to refresh balance:', err);
    }
  };

  if (!address) {
    return null;
  }

  return (
    <Card className="mb-6 border-zinc-200 bg-gradient-to-r from-zinc-50 to-zinc-100">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Payment Wallet
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                  Shared
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-zinc-900">
                  {truncateAddress(address)}
                </span>
                <button
                  onClick={copyAddress}
                  className="p-1 hover:bg-zinc-200 rounded transition-colors"
                  title="Copy address"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-zinc-500" />
                  )}
                </button>
                <a
                  href={`https://explorer.aptoslabs.com/account/${address}?network=testnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-zinc-200 rounded transition-colors"
                  title="View on Explorer"
                >
                  <ExternalLink className="w-4 h-4 text-zinc-500" />
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="text-right">
              <p className="text-xs text-zinc-500 mb-0.5">Balance</p>
              <p className="text-xl font-bold text-zinc-900">{balance} APT</p>
            </div>
            <Button
              onClick={fundFromFaucet}
              disabled={funding}
              size="sm"
              className="bg-zinc-900 hover:bg-zinc-800 text-white"
            >
              {funding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Funding...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Fund (Testnet)
                </>
              )}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <p className="mt-3 text-xs text-zinc-500">
          This wallet is shared across all your agents. Fund it once and all your agents can make API payments.
        </p>
      </CardContent>
    </Card>
  );
}




