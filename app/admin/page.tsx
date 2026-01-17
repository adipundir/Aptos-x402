'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { WalletProvider } from '@/components/wallet/WalletProvider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  ExternalLink, 
  User,
  Wallet,
  Calendar,
  Globe,
  Lock,
  Bot,
  Loader2,
  AlertTriangle,
  LogOut
} from 'lucide-react';

// Admin wallet address from environment variable
const ADMIN_WALLET_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS as string;

interface AgentOwner {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface AgentIdentity {
  id: string;
  verified: boolean;
  verifiedAt: string | null;
  verifiedBy: string | null;
  tokenAddress: string | null;
  mintTransactionHash: string | null;
  agentCard: any;
}

interface AgentWallet {
  address: string;
  publicKey: string;
}

interface AdminAgent {
  id: string;
  name: string;
  description: string | null;
  visibility: 'public' | 'private';
  apiIds: string[];
  createdAt: string;
  updatedAt: string;
  owner: AgentOwner | null;
  wallet: AgentWallet | null;
  identity: AgentIdentity | null;
}

interface Stats {
  total: number;
  verified: number;
  unverified: number;
}

// Normalize address for comparison (lowercase, ensure 0x prefix)
function normalizeAddress(address: string): string {
  const lower = address.toLowerCase();
  return lower.startsWith('0x') ? lower : `0x${lower}`;
}

function AdminPageContent() {
  const { 
    connect, 
    disconnect, 
    account, 
    connected, 
    wallets, 
    wallet: selectedWallet,
    isLoading: walletLoading 
  } = useWallet();

  const [isAdmin, setIsAdmin] = useState(false);
  const [agents, setAgents] = useState<AdminAgent[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, verified: 0, unverified: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<{ agentId: string; success: boolean; message: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  const connectedAddress = account?.address?.toString() || null;

  // Check admin status when wallet connects
  useEffect(() => {
    if (connected && connectedAddress) {
      const normalized = normalizeAddress(connectedAddress);
      const adminNormalized = normalizeAddress(ADMIN_WALLET_ADDRESS);
      
      if (normalized === adminNormalized) {
        setIsAdmin(true);
        setError(null);
        fetchAgents(connectedAddress);
      } else {
        setIsAdmin(false);
        setError(`Connected wallet is not authorized.\nExpected: ${ADMIN_WALLET_ADDRESS.slice(0, 10)}...${ADMIN_WALLET_ADDRESS.slice(-8)}`);
      }
    } else {
      setIsAdmin(false);
      setAgents([]);
      setStats({ total: 0, verified: 0, unverified: 0 });
    }
  }, [connected, connectedAddress]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchAgents = async (walletAddress?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/agents', {
        headers: {
          'admin-wallet': walletAddress || connectedAddress || '',
        },
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to fetch agents');
        return;
      }
      const data = await res.json();
      setAgents(data.agents);
      setStats(data.stats);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (agentId: string) => {
    setVerifyingId(agentId);
    setVerifyResult(null);
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'admin-wallet': connectedAddress || '',
        },
        body: JSON.stringify({ agentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVerifyResult({ agentId, success: false, message: data.error || 'Verification failed' });
        return;
      }
      setVerifyResult({ agentId, success: true, message: data.message });
      await fetchAgents();
    } catch (err: any) {
      setVerifyResult({ agentId, success: false, message: err.message || 'Verification failed' });
    } finally {
      setVerifyingId(null);
    }
  };

  const handleConnect = async (walletName: string) => {
    try {
      setError(null);
      await connect(walletName);
    } catch (err: any) {
      console.error('Wallet connection failed:', err);
      setError(err.message || 'Failed to connect wallet');
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setIsAdmin(false);
      setAgents([]);
      setStats({ total: 0, verified: 0, unverified: 0 });
      setError(null);
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  };

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.owner?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.owner?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filter === 'all' ||
      (filter === 'verified' && agent.identity?.verified) ||
      (filter === 'unverified' && !agent.identity?.verified);

    return matchesSearch && matchesFilter;
  });

  const getExplorerUrl = (txHash: string) => {
    const network = process.env.NEXT_PUBLIC_APTOS_NETWORK || 'aptos-testnet';
    const explorerNetwork = network.replace('aptos-', '');
    return `https://explorer.aptoslabs.com/txn/${txHash}?network=${explorerNetwork}`;
  };

  // Get available wallets (installed/detected ones)
  const availableWallets = wallets.filter((w) => w.readyState === 'Installed');

  // Don't render until mounted (avoids hydration issues)
  if (!mounted) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  // Not connected - show wallet connect
  if (!connected) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="h-8 w-8 text-zinc-600" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">Admin Access</h1>
            <p className="text-zinc-600">Connect your wallet to access the admin panel</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
            </div>
          )}

          {/* Wallet Options */}
          <div className="space-y-3">
            {availableWallets.length > 0 ? (
              availableWallets.map((w) => (
                <Button
                  key={w.name}
                  onClick={() => handleConnect(w.name)}
                  disabled={walletLoading}
                  variant="outline"
                  className="w-full h-12 justify-start gap-3 text-[#1a1a1a] bg-[#f2f2f2]"
                >
                  {w.icon && (
                    <img src={w.icon} alt={w.name} className="w-6 h-6 rounded" />
                  )}
                  <span className="flex-1 text-left">{w.name}</span>
                  {walletLoading && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </Button>
              ))
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-zinc-500 mb-4">
                  No wallet detected. Install a wallet to continue.
                </p>
                <Button
                  onClick={() => window.open('https://petra.app/', '_blank')}
                  className="w-full h-12 bg-zinc-900 hover:bg-zinc-800"
                >
                  <Wallet className="h-5 w-5 mr-2" />
                  Install Petra Wallet
                </Button>
              </div>
            )}
          </div>

          <p className="mt-4 text-xs text-zinc-500">
            Only the admin wallet can access this page
          </p>
        </Card>
      </div>
    );
  }

  // Connected but not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-zinc-900 mb-2">Access Denied</h2>
          <p className="text-zinc-600 mb-4">
            The connected wallet is not authorized for admin access.
          </p>
          <div className="bg-zinc-100 rounded-lg p-3 mb-6">
            <p className="text-xs text-zinc-500 mb-1">Connected Wallet</p>
            <code className="text-sm text-zinc-700 break-all">{connectedAddress}</code>
          </div>
          <Button onClick={handleDisconnect} variant="outline" className="w-full">
            <LogOut className="h-4 w-4 mr-2" />
            Disconnect & Try Another Wallet
          </Button>
        </Card>
      </div>
    );
  }

  // Admin view
  return (
    <div className="min-h-screen bg-zinc-50 pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 mb-2">Admin Panel</h1>
            <p className="text-zinc-600">Manage agent verifications and monitor the platform</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-sm font-medium">Admin Connected</span>
              {selectedWallet?.icon && (
                <img src={selectedWallet.icon} alt={selectedWallet.name} className="w-4 h-4 rounded" />
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleDisconnect}>
              <LogOut className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-zinc-100 rounded-xl">
                <Bot className="h-6 w-6 text-zinc-600" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">Total Agents</p>
                <p className="text-2xl font-bold text-zinc-900">{stats.total}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <ShieldCheck className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">Verified</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.verified}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-xl">
                <ShieldAlert className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">Pending Verification</p>
                <p className="text-2xl font-bold text-amber-600">{stats.unverified}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search by name, ID, or owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              size="sm"
            >
              All ({stats.total})
            </Button>
            <Button
              variant={filter === 'unverified' ? 'default' : 'outline'}
              onClick={() => setFilter('unverified')}
              size="sm"
              className={filter === 'unverified' ? 'bg-amber-600 hover:bg-amber-700' : ''}
            >
              Pending ({stats.unverified})
            </Button>
            <Button
              variant={filter === 'verified' ? 'default' : 'outline'}
              onClick={() => setFilter('verified')}
              size="sm"
              className={filter === 'verified' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            >
              Verified ({stats.verified})
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchAgents()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Loading State */}
        {loading && agents.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="p-8 text-center mb-6">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <p className="text-zinc-600">{error}</p>
            <Button onClick={() => fetchAgents()} variant="outline" className="mt-4">
              Try Again
            </Button>
          </Card>
        )}

        {/* Verification Result Toast */}
        {verifyResult && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
              verifyResult.success
                ? 'bg-emerald-50 border border-emerald-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {verifyResult.success ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`font-medium ${verifyResult.success ? 'text-emerald-800' : 'text-red-800'}`}>
                {verifyResult.success ? 'Verification Successful' : 'Verification Failed'}
              </p>
              <p className={`text-sm ${verifyResult.success ? 'text-emerald-700' : 'text-red-700'}`}>
                {verifyResult.message}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVerifyResult(null)}
              className="text-zinc-500"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Agents List */}
        <div className="space-y-4">
          {!loading && filteredAgents.length === 0 ? (
            <Card className="p-8 text-center">
              <Bot className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
              <p className="text-zinc-500">No agents found matching your criteria</p>
            </Card>
          ) : (
            filteredAgents.map((agent) => (
              <Card key={agent.id} className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  {/* Agent Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-bold text-zinc-900">{agent.name}</h3>
                      <Badge variant={agent.visibility === 'public' ? 'default' : 'secondary'}>
                        {agent.visibility === 'public' ? (
                          <Globe className="h-3 w-3 mr-1" />
                        ) : (
                          <Lock className="h-3 w-3 mr-1" />
                        )}
                        {agent.visibility}
                      </Badge>
                      {agent.identity?.verified ? (
                        <Badge className="bg-emerald-100 text-emerald-700">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-300 text-amber-700">
                          <ShieldAlert className="h-3 w-3 mr-1" />
                          Unverified
                        </Badge>
                      )}
                    </div>

                    {agent.description && (
                      <p className="text-sm text-zinc-600 mb-3 line-clamp-2">{agent.description}</p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {/* Owner */}
                      <div className="flex items-center gap-2 text-zinc-600">
                        <User className="h-4 w-4 text-zinc-400" />
                        <span>
                          {agent.owner?.name || agent.owner?.email || 'Unknown owner'}
                        </span>
                      </div>

                      {/* Wallet */}
                      {agent.wallet && (
                        <div className="flex items-center gap-2 text-zinc-600">
                          <Wallet className="h-4 w-4 text-zinc-400" />
                          <code className="text-xs bg-zinc-100 px-2 py-0.5 rounded">
                            {agent.wallet.address.slice(0, 10)}...{agent.wallet.address.slice(-8)}
                          </code>
                        </div>
                      )}

                      {/* Created */}
                      <div className="flex items-center gap-2 text-zinc-600">
                        <Calendar className="h-4 w-4 text-zinc-400" />
                        <span>{new Date(agent.createdAt).toLocaleDateString()}</span>
                      </div>

                      {/* Agent ID */}
                      <div className="flex items-center gap-2 text-zinc-600">
                        <Bot className="h-4 w-4 text-zinc-400" />
                        <code className="text-xs bg-zinc-100 px-2 py-0.5 rounded truncate">
                          {agent.id}
                        </code>
                      </div>
                    </div>

                    {/* Token Address if minted */}
                    {agent.identity?.tokenAddress && (
                      <div className="mt-3 pt-3 border-t border-zinc-100">
                        <p className="text-xs text-zinc-500 mb-1">On-chain Token Address</p>
                        <code className="text-xs bg-zinc-100 px-2 py-1 rounded block truncate">
                          {agent.identity.tokenAddress}
                        </code>
                        {agent.identity.mintTransactionHash && (
                          <a
                            href={getExplorerUrl(agent.identity.mintTransactionHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                          >
                            View mint transaction <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex flex-col gap-2">
                    {!agent.identity?.verified ? (
                      <Button
                        onClick={() => handleVerify(agent.id)}
                        disabled={verifyingId === agent.id}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {verifyingId === agent.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            Verify Agent
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          Verified
                        </p>
                        {agent.identity.verifiedAt && (
                          <p className="text-xs text-zinc-500 mt-1">
                            {new Date(agent.identity.verifiedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Wrap with wallet provider
function AdminPageWithProvider() {
  return (
    <WalletProvider>
      <AdminPageContent />
    </WalletProvider>
  );
}

// Use dynamic import with no SSR to avoid wallet extension issues
export default dynamic(() => Promise.resolve(AdminPageWithProvider), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
    </div>
  ),
});
