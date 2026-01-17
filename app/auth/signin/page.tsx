'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { SiGoogle, SiGithub } from '@icons-pack/react-simple-icons';

export default function SignInPage() {
  const [loading, setLoading] = useState<'google' | 'github' | null>(null);

  const handleSignIn = async (provider: 'google' | 'github') => {
    setLoading(provider);
    try {
      await signIn(provider, { callbackUrl: '/' });
    } catch (error) {
      console.error('Sign in error:', error);
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-[380px] bg-white border border-zinc-200 shadow-lg rounded-xl p-6">
        <div className="space-y-1 pb-4">
          <h1 className="text-lg font-semibold text-zinc-900">
            Sign in
          </h1>
          <p className="text-sm text-zinc-500">
            Continue to Agent Composer (Beta)
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => handleSignIn('google')}
            disabled={loading !== null}
            variant="outline"
            className="w-full h-11 bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-200 font-medium"
          >
            {loading === 'google' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <SiGoogle className="w-4 h-4 mr-2" />
            )}
            Continue with Google
          </Button>

          <div className="relative">
            <Button
              disabled={true}
              variant="outline"
              className="w-full h-11 bg-zinc-50 text-zinc-400 border border-zinc-100 cursor-not-allowed font-medium"
            >
              <SiGithub className="w-4 h-4 mr-2 opacity-50" />
              Continue with GitHub
            </Button>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 bg-zinc-200 text-zinc-500 rounded font-medium">
              Soon
            </span>
          </div>
        </div>

        <p className="text-[11px] text-zinc-400 text-center pt-4">
          By continuing, you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
}
