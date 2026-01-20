'use client';

import { useEffect, useState } from 'react';
import { Bot, Sparkles, Zap, ArrowRight, Clock } from 'lucide-react';
import Link from 'next/link';

export default function ComposerComingSoonPage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [dots, setDots] = useState('');

  useEffect(() => {
    setIsLoaded(true);

    // Animated dots
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 relative overflow-hidden">
      {/* Gradient mesh background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-zinc-200/80 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-gradient-to-tl from-zinc-300/60 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex">
        {/* Left side - Main content */}
        <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-16">
          <div className={`max-w-xl transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>

            {/* Status badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-zinc-200 shadow-sm mb-8">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-xs font-medium text-zinc-600 uppercase tracking-wider">In Development</span>
            </div>

            {/* Main heading */}
            <h1
              className="text-5xl sm:text-6xl lg:text-7xl text-zinc-900 mb-4 leading-[0.9] tracking-tight"
              style={{ fontFamily: 'Impact, "Arial Black", sans-serif' }}
            >
              Agent
              <br />
              Composer
            </h1>

            {/* Subtitle with animated dots */}
            <p className="text-xl sm:text-2xl text-zinc-400 mb-8 font-light">
              Coming soon<span className="inline-block w-8">{dots}</span>
            </p>

            {/* Description */}
            <p className="text-zinc-600 text-base sm:text-lg leading-relaxed mb-10 max-w-md">
              Build AI agents that interact with x402-protected APIs. Autonomous payments, seamless integration, endless possibilities.
            </p>

            {/* CTA */}
            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white text-sm rounded-lg font-medium hover:bg-zinc-800 transition-all hover:gap-3"
              >
                Back to Home
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-zinc-700 text-sm rounded-lg font-medium border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
              >
                Read the Docs
              </Link>
            </div>
          </div>
        </div>

        {/* Right side - Visual element */}
        <div className="hidden lg:flex flex-1 items-center justify-center p-16">
          <div className={`relative transition-all duration-1000 delay-300 ${isLoaded ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>

            {/* Large floating card */}
            <div className="relative w-80 h-96 bg-white rounded-3xl shadow-2xl shadow-zinc-200/50 border border-zinc-100 p-6 transform rotate-3 hover:rotate-0 transition-transform duration-500">
              {/* Card header */}
              <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-900">Your Agent</div>
                  <div className="text-xs text-zinc-400">Ready to deploy</div>
                </div>
              </div>

              {/* Fake loading bars */}
              <div className="mt-6 space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-zinc-500">API Connections</span>
                    <span className="text-zinc-400">Setup pending</span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full w-0 bg-zinc-300 rounded-full animate-pulse" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-zinc-500">Payment Config</span>
                    <span className="text-zinc-400">Setup pending</span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full w-0 bg-zinc-300 rounded-full animate-pulse" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-zinc-500">Trust Score</span>
                    <span className="text-zinc-400">--</span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full" />
                </div>
              </div>

              {/* Placeholder button */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="w-full h-10 rounded-lg bg-zinc-100 flex items-center justify-center">
                  <span className="text-xs text-zinc-400 font-medium">Launch Agent</span>
                </div>
              </div>

              {/* Floating accents */}
              <div className="absolute -top-4 -right-4 w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center shadow-lg animate-bounce" style={{ animationDuration: '3s' }}>
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -bottom-3 -left-3 w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center shadow-md">
                <Zap className="w-4 h-4 text-zinc-600" />
              </div>
            </div>

            {/* Background decoration */}
            <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-dashed border-zinc-200" />
            <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-dashed border-zinc-100" />
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 py-4 px-8 sm:px-16">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Building the future of autonomous agent payments</span>
          <div className="flex items-center gap-4">
            <a href="https://github.com/adipundir/Aptos-x402" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-600 transition-colors">
              GitHub
            </a>
            <a href="https://www.npmjs.com/package/aptos-x402" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-600 transition-colors">
              NPM
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
