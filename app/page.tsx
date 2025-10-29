"use client";

import { ArrowRight, Code2, Zap, Shield, Package, Download, GitBranch } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const [npmStats, setNpmStats] = useState<{
    downloads: number;
    version: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/npm-stats')
      .then(res => res.json())
      .then(data => setNpmStats(data))
      .catch(err => console.error('Failed to fetch NPM stats:', err));
  }, []);

  const displayDownloads = npmStats 
    ? (npmStats.downloads < 200 ? '200+' : npmStats.downloads.toLocaleString())
    : '200+';

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      
      <div className="relative">
        {/* Hero Section */}
        <div className="container mx-auto px-6 pt-32 pb-24 max-w-5xl">
          <div className="text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 bg-zinc-50/50 backdrop-blur-sm text-sm text-zinc-700">
              <Package className="w-3 h-3" />
              <span>x402 Payment Protocol for Aptos</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-6xl tracking-tight leading-tight" style={{ fontFamily: 'Impact, "Arial Black", sans-serif' }}>
              <span className="text-zinc-900">Aptos-native</span>
              <br />
              <span className="text-zinc-900">x402 payment protocol</span>
            </h1>

            {/* Tagline */}
            <p className="text-xl text-zinc-600 max-w-2xl mx-auto leading-relaxed">
              Monetize your APIs with blockchain micropayments.
            </p>

            {/* CTA Buttons */}
            <div className="flex items-center justify-center gap-4 pt-4">
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition-colors"
              >
                Try Demo
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 px-6 py-3 border border-zinc-200 text-zinc-900 rounded-lg font-medium hover:bg-zinc-50 transition-colors"
              >
                Documentation
              </Link>
            </div>

            {/* Quick Install */}
            <div className="pt-8">
              <p className="text-sm text-zinc-500 mb-3">Install via npm</p>
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-zinc-900 rounded-lg font-mono text-sm text-zinc-100">
                <span>npm install aptos-x402</span>
              </div>
              
              {/* NPM Stats */}
              <div className="flex items-center justify-center gap-8 mt-8">
                <div className="flex items-center gap-2.5 text-base text-zinc-600">
                  <Download className="w-5 h-5" />
                  <span className="font-bold text-xl text-zinc-900">{displayDownloads}</span>
                  <span>weekly downloads</span>
                </div>
                {npmStats && (
                  <div className="flex items-center gap-2.5 text-base text-zinc-600">
                    <GitBranch className="w-5 h-5" />
                    <span className="font-bold text-xl text-zinc-900">v{npmStats.version}</span>
                    <span>latest</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="container mx-auto px-6 pb-24 max-w-5xl">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-lg border border-zinc-200 bg-white/50 backdrop-blur-sm hover:border-zinc-300 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center mb-4">
                <Code2 className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                Zero Payment Logic
              </h3>
              <p className="text-zinc-600 text-sm leading-relaxed">
                Just configure middleware. Your API routes stay clean—no payment code needed.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-lg border border-zinc-200 bg-white/50 backdrop-blur-sm hover:border-zinc-300 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center mb-4">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                Fast Finality
              </h3>
              <p className="text-zinc-600 text-sm leading-relaxed">
                Built on Aptos blockchain. Verification in &lt;50ms, settlement in 1-3 seconds.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-lg border border-zinc-200 bg-white/50 backdrop-blur-sm hover:border-zinc-300 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center mb-4">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                x402 Compliant
              </h3>
              <p className="text-zinc-600 text-sm leading-relaxed">
                Follows Coinbase x402 specification for machine-to-machine micropayments.
              </p>
            </div>
          </div>
        </div>

        {/* Code Example Section */}
        <div className="container mx-auto px-6 pb-24 max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-zinc-900 mb-3">
              Simple to implement
            </h2>
            <p className="text-zinc-600">
              Three steps to monetize your APIs
                          </p>
                        </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="rounded-xl border border-zinc-200 bg-white/50 backdrop-blur-sm flex flex-col">
              <div className="p-5 border-b border-zinc-200 bg-zinc-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center text-sm font-semibold">
                    1
                  </div>
                  <h3 className="font-semibold text-zinc-900">
                    Configure middleware
                  </h3>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="space-y-2.5 text-xs text-zinc-600 mb-4">
                  <div className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-zinc-400 mt-1.5 flex-shrink-0"></div>
                    <span>Set recipient address</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-zinc-400 mt-1.5 flex-shrink-0"></div>
                    <span>Configure protected routes</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-zinc-400 mt-1.5 flex-shrink-0"></div>
                    <span>Set price per request</span>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg bg-zinc-900">
                  <pre className="text-zinc-100 p-3 text-[10px] leading-[1.4] font-mono">
{`// middleware.ts
import { paymentMiddleware }
  from 'aptos-x402';

export const middleware =
  paymentMiddleware(
    process.env
      .PAYMENT_RECIPIENT_ADDRESS!,
    {
      '/api/premium/weather': {
        price: '1000000',
        network: 'testnet',
      }
    },
    { url: process.env
        .FACILITATOR_URL! }
  );`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="rounded-xl border border-zinc-200 bg-white/50 backdrop-blur-sm flex flex-col">
              <div className="p-5 border-b border-zinc-200 bg-zinc-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center text-sm font-semibold">
                    2
                  </div>
                  <h3 className="font-semibold text-zinc-900">
                    Write your API route
                  </h3>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="space-y-2.5 text-xs text-zinc-600 mb-4">
                  <div className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-zinc-400 mt-1.5 flex-shrink-0"></div>
                    <span>No payment logic needed</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-zinc-400 mt-1.5 flex-shrink-0"></div>
                    <span>Payment verified automatically</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-zinc-400 mt-1.5 flex-shrink-0"></div>
                    <span>Focus on your business logic</span>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg bg-zinc-900">
                  <pre className="text-zinc-100 p-3 text-[10px] leading-[1.4] font-mono">
{`// route.ts
import { NextResponse }
  from 'next/server';

export async function GET() {
  // Payment already verified!

  return NextResponse.json({
    temperature: 72,
    condition: 'Sunny',
    premium: true
  });
}`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="rounded-xl border border-zinc-200 bg-white/50 backdrop-blur-sm flex flex-col">
              <div className="p-5 border-b border-zinc-200 bg-zinc-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center text-sm font-semibold">
                    3
                  </div>
                  <h3 className="font-semibold text-zinc-900">
                    Client pays automatically
                  </h3>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="space-y-2.5 text-xs text-zinc-600 mb-4">
                  <div className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-zinc-400 mt-1.5 flex-shrink-0"></div>
                    <span>Detects 402 response</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-zinc-400 mt-1.5 flex-shrink-0"></div>
                    <span>Signs transaction</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-zinc-400 mt-1.5 flex-shrink-0"></div>
                    <span>Retries with payment</span>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg bg-zinc-900">
                  <pre className="text-zinc-100 p-3 text-[10px] leading-[1.4] font-mono">
{`// client.ts
import { x402axios }
  from 'aptos-x402';

const result = await x402axios.get(
  'https://api.example.com/premium/weather',
  {
    privateKey: '0x...'
  }
);

// Done! Payment handled
console.log(result.data);`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
          </div>

        {/* Footer with Large Branding */}
        <div className="container mx-auto px-6 pb-12 max-w-5xl">
          <div className="pt-24 border-t border-zinc-200">
            {/* Large Typography */}
            <div className="text-center mb-12">
              <h2 className="text-[120px] md:text-[160px] lg:text-[200px] font-black leading-none tracking-tighter text-zinc-900" style={{ fontFamily: 'Impact, "Arial Black", sans-serif' }}>
                aptos-x402
                </h2>
            </div>
            
            {/* Footer Links */}
            <div className="flex items-center justify-between text-sm text-zinc-600">
              <div>
                Built for the <span className="font-semibold text-zinc-900">Aptos</span> ecosystem
              </div>
              <div className="flex items-center gap-6">
                <a
                  href="https://github.com/adipundir/aptos-x402"
                      target="_blank"
                      rel="noopener noreferrer"
                  className="hover:text-zinc-900 transition-colors"
                >
                  GitHub
                </a>
                <a
                  href="https://www.npmjs.com/package/aptos-x402"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-zinc-900 transition-colors"
                >
                  NPM
                </a>
                <Link href="/docs" className="hover:text-zinc-900 transition-colors">
                  Docs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
