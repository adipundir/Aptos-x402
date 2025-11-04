'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, Wallet, RefreshCw } from 'lucide-react';
import { getUserIdHeaders } from '@/lib/utils/user-id';

interface FundingModalProps {
  agentId: string;
  walletAddress: string;
  walletType: 'agent' | 'user';
  isOwner: boolean;
  onClose: () => void;
  onBalanceRefresh?: () => void;
}

export function FundingModal({ 
  agentId, 
  walletAddress, 
  walletType, 
  isOwner, 
  onClose,
  onBalanceRefresh 
}: FundingModalProps) {
  const [balance, setBalance] = useState<string>('0.00000000');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchBalance();
  }, [agentId]);

  const fetchBalance = async () => {
    try {
      let res;
      if (walletType === 'user') {
        // Fetch user's wallet balance directly
        res = await fetch(`/api/users/wallet/balance`, {
          headers: getUserIdHeaders(),
        });
      } else {
        // Fetch agent's balance
        res = await fetch(`/api/agents/${agentId}/balance`, {
          headers: getUserIdHeaders(),
        });
      }
      const data = await res.json();
      if (data.balanceAPT) {
        setBalance(data.balanceAPT);
      }
      // Also refresh parent's balance
      if (onBalanceRefresh) {
        onBalanceRefresh();
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            {walletType === 'user' ? 'Fund Your Wallet' : 'Fund Agent'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {walletType === 'user' && !isOwner && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                💡 This is a public agent. You're using your own wallet to pay for API calls.
              </p>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-zinc-700 mb-2 block">
              {walletType === 'user' ? 'Your Wallet Address' : 'Agent Wallet Address'}
            </label>
            <div className="flex items-center gap-2">
              <Input
                value={walletAddress}
                readOnly
                className="font-mono text-xs"
              />
              <Button
                size="sm"
                
                onClick={copyAddress}
                className="flex-shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-zinc-700">
                Current Balance
              </label>
              <Button
                size="sm"
                variant="ghost"
                onClick={fetchBalance}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="text-2xl font-bold text-zinc-900">
              {loading ? '...' : `${balance} APT`}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-200">
            <p className="text-sm text-zinc-600 mb-4">
              {walletType === 'user' 
                ? 'To fund your wallet, send APT (testnet) to the address above. This wallet will be used to pay for API calls when using public agents.'
                : 'To fund this agent, send APT (testnet) to the wallet address above. You can use the Aptos testnet faucet or transfer from another wallet.'
              }
            </p>
            <div className="flex gap-2">
              <Button
                
                onClick={() => window.open(`https://aptos.dev/network/faucet`, '_blank')}
                className="flex-1"
              >
                Open Faucet
              </Button>
              <Button
                variant="default"
                onClick={onClose}
                className="flex-1"
              >
                Done
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


