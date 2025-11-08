'use client';

import { useState } from 'react';
import { EtheralShadow } from '@/components/ui/shadcn-io/etheral-shadow';
import { WaitlistModal } from '@/components/composer/WaitlistModal';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';

export default function ComposerPage() {
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 pt-8">
      {/* Single Frame Container */}
      <div className="w-full max-w-[95vw] h-[90vh] max-h-[90vh] rounded-2xl shadow-lg overflow-hidden flex bg-stone-50">
        {/* Left Panel - Code-like text about composer */}
        <div className="w-[40%] bg-stone-50 border-r border-zinc-200 p-6 pt-8 flex flex-col overflow-hidden">
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-xl font-bold text-zinc-900" style={{ fontFamily: 'Impact, "Arial Black", sans-serif' }}>
                Aptos x402
              </h1>
              <span className="px-2 py-0.5 text-xs font-medium text-zinc-700 bg-zinc-100 rounded border border-zinc-200">
                composer.tsx
              </span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
            <pre className="text-sm font-mono text-zinc-700 leading-relaxed whitespace-pre-wrap">
{`// Agent Composer - Coming Soon
// Create and manage AI agents that interact with x402-protected APIs

/**
 * The Agent Composer is a powerful tool that enables you to:
 * 
 * 1. Create Custom AI Agents
 *    - Design agents with specific behaviors and capabilities
 *    - Configure agents to interact with x402-protected APIs
 *    - Set up payment flows and resource access
 * 
 * 2. Manage Agent Lifecycle
 *    - Monitor agent performance and usage statistics
 *    - Track API calls and payment transactions
 *    - Manage agent visibility (public/private)
 * 
 * 3. Integrate with x402 Protocol
 *    - Seamlessly connect agents to payment-protected APIs
 *    - Handle automatic micropayments for API access
 *    - Manage agent wallet balances and funding
 * 
 * 4. API Marketplace
 *    - Discover and integrate with available APIs
 *    - Join the waitlist to list your own APIs
 *    - Access a growing ecosystem of x402-enabled services
 * 
 * Features:
 * - Visual agent creation wizard
 * - Real-time chat interface for agent interaction
 * - Comprehensive agent analytics and monitoring
 * - Secure wallet management
 * - API discovery and integration tools
 * 
 * Status: Launching Soon
 * 
 * Join the API waitlist to be notified when the composer
 * becomes available and to list your APIs in the marketplace.
 */`}
            </pre>
          </div>

          {/* API Waitlist Button */}
          <div className="mt-4 pt-4 border-t border-zinc-200">
            <Button
              onClick={() => setShowWaitlistModal(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Mail className="w-4 h-4 mr-2" />
              Join API Waitlist
            </Button>
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
          <div className="w-full h-full flex items-center justify-center">
            <EtheralShadow
              color="rgba(128, 128, 128, 1)"
              animation={{ scale: 100, speed: 90 }}
              noise={{ opacity: 1, scale: 1.2 }}
              sizing="fill"
              className="rounded-2xl"
            >
              <h1 
                className="md:text-7xl text-6xl lg:text-8xl font-bold text-center text-black relative z-20"
                style={{ fontFamily: 'Impact, "Arial Black", sans-serif' }}
              >
                Launching Soon
              </h1>
            </EtheralShadow>
          </div>
        </div>
      </div>

      {/* Waitlist Modal */}
      {showWaitlistModal && (
        <WaitlistModal
          onClose={() => setShowWaitlistModal(false)}
          onSuccess={() => setShowWaitlistModal(false)}
        />
      )}
    </div>
  );
}

