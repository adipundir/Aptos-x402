import { AgentCardSkeleton } from '@/components/composer/AgentCardSkeleton';
import { Badge } from '@/components/ui/badge';

export default function ComposerLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-24 max-w-6xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1
                className="text-3xl sm:text-4xl font-bold text-zinc-900"
                style={{ fontFamily: 'Impact, "Arial Black", sans-serif' }}
              >
                Agent Composer
              </h1>
              <Badge className="rounded-full bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
                Beta
              </Badge>
            </div>
            <p className="text-sm sm:text-base text-zinc-600">
              Create and manage AI agents that can interact with x402-protected APIs
            </p>
          </div>
          <div className="w-full sm:w-auto">
            <div className="h-10 sm:h-12 rounded-lg bg-zinc-200 animate-pulse w-full sm:w-40" />
          </div>
        </div>
        <div className="space-y-6">
          <AgentCardSkeleton />
          <AgentCardSkeleton />
          <AgentCardSkeleton />
        </div>
      </div>
    </div>
  );
}
