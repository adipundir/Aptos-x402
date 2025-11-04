'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FundingModal } from '@/components/composer/FundingModal';
import { Loader2, ArrowLeft, Wallet, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { getUserIdHeaders } from '@/lib/utils/user-id';

export default function AgentSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.agentId as string;
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [balance, setBalance] = useState<string>('0.00000000');
  const [showFunding, setShowFunding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    visibility: 'private' as 'public' | 'private',
  });

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
      setFormData({
        name: data.agent.name || '',
        description: data.agent.description || '',
        imageUrl: data.agent.imageUrl || '',
        visibility: data.agent.visibility || 'private',
      });
      fetchBalance();
    } catch (error) {
      console.error('Failed to fetch agent:', error);
      router.push('/composer');
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/balance`, {
        headers: getUserIdHeaders(),
      });
      const data = await res.json();
      if (data.balanceAPT) {
        setBalance(data.balanceAPT);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getUserIdHeaders(),
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        fetchAgent();
        alert('Agent updated successfully!');
      } else {
        alert('Failed to update agent');
      }
    } catch (error) {
      alert('Failed to update agent');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this agent? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE',
        headers: getUserIdHeaders(),
      });

      if (res.ok) {
        router.push('/composer');
      } else {
        alert('Failed to delete agent');
      }
    } catch (error) {
      alert('Failed to delete agent');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-24 max-w-4xl flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!agent) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-6 py-24 max-w-4xl">
        <div className="mb-6">
          <Link href="/composer">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Agents
            </Button>
          </Link>
        </div>

      <div className="space-y-6">
        {/* Wallet Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Wallet Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-700 mb-2 block">
                Wallet Address
              </label>
              <div className="font-mono text-sm bg-zinc-50 p-3 rounded border break-all">
                {agent.walletAddress}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700 mb-2 block">
                Balance
              </label>
              <div className="text-2xl font-bold text-zinc-900">
                {balance} APT
              </div>
            </div>
            <Button onClick={() => setShowFunding(true)}>
              <Wallet className="w-4 h-4 mr-2" />
              Fund Agent
            </Button>
          </CardContent>
        </Card>

        {/* Agent Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-700 mb-2 block">
                Name
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-700 mb-2 block">
                Description
              </label>
              <textarea
                className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-700 mb-2 block">
                Image URL
              </label>
              <Input
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-700 mb-2 block">
                Visibility
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={formData.visibility === 'public'}
                    onChange={() => setFormData({ ...formData, visibility: 'public' })}
                  />
                  <span>Public</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={formData.visibility === 'private'}
                    onChange={() => setFormData({ ...formData, visibility: 'private' })}
                  />
                  <span>Private</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Agent
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {showFunding && (
        <FundingModal
          agentId={agentId}
          walletAddress={agent.walletAddress}
          onClose={() => {
            setShowFunding(false);
            fetchBalance();
          }}
        />
      )}
      </div>
    </div>
  );
}

