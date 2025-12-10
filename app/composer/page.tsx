'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, X } from 'lucide-react';

const Spline = dynamic(() => import('@splinetool/react-spline').then((mod) => mod.default), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-black" />,
});

const sceneUrl = 'https://prod.spline.design/UOP5kw2r81LWp34u/scene.splinecode';

export default function ComposerWaitlistPage() {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const glassButtonClasses = useMemo(
    () =>
      'group relative overflow-hidden rounded-full border border-white/30 bg-white/15 px-7 py-3 text-white backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.35)] transition duration-300 hover:-translate-y-0.5 hover:bg-white/25 hover:border-white/60 hover:shadow-[0_25px_80px_rgba(0,0,0,0.45)] active:translate-y-0',
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      setError('Please add your name and email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          apiType: 'agent-composer',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Unable to join the waitlist.');
      }

      setBanner("You're on the list. We'll reach out soon.");
      setShowModal(false);
      setName('');
      setEmail('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to join the waitlist.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 z-0 w-full h-full scale-125 pointer-events-auto">
        <Spline 
          scene={sceneUrl}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/10 via-black/20 to-black/30 pointer-events-none" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-16 pointer-events-none">
        <div className="flex-1" />
        <div className="flex flex-col items-center justify-center gap-4 pb-16 pointer-events-auto">
          <button
            type="button"
            className={glassButtonClasses}
            onClick={() => {
              setError(null);
              setShowModal(true);
            }}
          >
            <span className="relative z-10 flex items-center gap-2 text-base font-semibold">
              Join the waitlist
              <Mail className="h-4 w-4" />
            </span>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/20 via-white/40 to-white/20 opacity-0 transition duration-300 group-hover:opacity-100" />
          </button>
        </div>

        {banner && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-4 py-2 text-sm text-emerald-100">
            {banner}
          </div>
        )}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-black/90 shadow-2xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute right-3 top-3 rounded-full p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="space-y-5 p-6">
              <div className="space-y-2 text-left">
                <p className="text-sm font-medium text-amber-100">Early access</p>
                <h2 className="text-2xl font-semibold text-white">Join the waitlist</h2>
                <p className="text-sm text-zinc-200">
                  Drop your details and we&apos;ll notify you when the new Agent Composer is ready.
                </p>
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-sm font-medium text-zinc-100">
                    Name
                  </label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    required
                    disabled={submitting}
                    className="border-white/20 bg-white/10 text-white placeholder:text-white/60 focus-visible:ring-white/60"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-zinc-100">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={submitting}
                    className="border-white/20 bg-white/10 text-white placeholder:text-white/60 focus-visible:ring-white/60"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-white text-black hover:bg-white/90"
                >
                  {submitting ? 'Joining...' : 'Join waitlist'}
                </Button>
              </form>

              <p className="text-center text-xs text-zinc-400">
                We use Resend to send confirmation securely. You can opt out anytime.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
