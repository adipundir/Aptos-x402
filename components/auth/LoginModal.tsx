'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { SiGoogle, SiGithub } from '@icons-pack/react-simple-icons';

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const [loading, setLoading] = useState<'google' | 'github' | null>(null);

  const handleSignIn = async (provider: 'google' | 'github') => {
    setLoading(provider);
    try {
      await signIn(provider, { callbackUrl: '/composer' });
    } catch (error) {
      console.error('Sign in error:', error);
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px] p-6 bg-white border border-zinc-200 shadow-xl rounded-xl">
        <DialogHeader className="space-y-1 pb-2">
          <DialogTitle className="text-lg font-semibold text-zinc-900">
            Sign in
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-500">
            Continue to Agent Composer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
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

        <p className="text-[11px] text-zinc-400 text-center pt-3">
          By continuing, you agree to our Terms & Privacy Policy
        </p>
      </DialogContent>
    </Dialog>
  );
}
