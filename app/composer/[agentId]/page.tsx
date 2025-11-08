'use client';

import { EtheralShadow } from '@/components/ui/shadcn-io/etheral-shadow';

export default function AgentChatPage() {
  return (
    <div className="min-h-screen bg-white flex w-full justify-center items-center p-8">
      <div className="w-[90%] h-[90vh] flex items-center justify-center">
        <EtheralShadow
          color="rgba(128, 128, 128, 1)"
          animation={{ scale: 100, speed: 90 }}
          noise={{ opacity: 1, scale: 1.2 }}
          sizing="fill"
          className="rounded-2xl"
        >
          <h1 className="md:text-7xl text-6xl lg:text-8xl font-bold text-center text-black relative z-20">
            Launching Soon
          </h1>
        </EtheralShadow>
      </div>
    </div>
  );
}

