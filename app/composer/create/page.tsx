import { AgentCreationWizard } from '@/components/composer/AgentCreationWizard';

export default function CreateAgentPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-6 py-24 max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-zinc-900 mb-2" style={{ fontFamily: 'Impact, "Arial Black", sans-serif' }}>Create an Agent</h1>
          <p className="text-zinc-600">
            Design an agent with x402 resources and custom behavior.
          </p>
        </div>
      <AgentCreationWizard />
      </div>
    </div>
  );
}

