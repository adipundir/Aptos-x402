'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, X } from 'lucide-react';

interface WaitlistModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function WaitlistModal({ onClose, onSuccess }: WaitlistModalProps) {
  const [email, setEmail] = useState('');
  const [apiType, setApiType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !apiType.trim()) {
      setError('Please fill in all fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, apiType: apiType.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to join waitlist');
      }

      // Success
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Waitlist submission error:', err);
      const message = err instanceof Error ? err.message : 'Failed to join waitlist';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Join API Waitlist
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="text-sm font-medium text-zinc-700 mb-2 block">
                Email Address *
              </label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="apiType" className="text-sm font-medium text-zinc-700 mb-2 block">
                What type of API do you want to list? *
              </label>
              <Input
                id="apiType"
                type="text"
                placeholder="e.g., Weather API, Payment API, Data Analytics API..."
                value={apiType}
                onChange={(e) => setApiType(e.target.value)}
                required
                disabled={loading}
              />
              <p className="text-xs text-zinc-500 mt-1">
                Describe the type of API you'd like to have listed
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white"
              >
                {loading ? 'Submitting...' : 'Join Waitlist'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

