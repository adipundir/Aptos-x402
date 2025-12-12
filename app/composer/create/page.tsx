import { AgentCreationWizard } from '@/components/composer/AgentCreationWizard';
import { Badge } from '@/components/ui/badge';

export default function CreateAgentPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-24 max-w-6xl">
        <div className="mb-6 sm:mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900" style={{ fontFamily: 'Impact, "Arial Black", sans-serif' }}>Create an Agent</h1>
            <Badge className="rounded-full bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
              Beta
            </Badge>
          </div>
          <p className="text-sm sm:text-base text-zinc-600">
            Design an agent with x402 resources and custom behavior. Beta release—expect rapid updates during testing.
          </p>
        </div>
      <AgentCreationWizard />
      </div>
    </div>
  );
}

