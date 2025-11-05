'use client';

import { Card } from '@/components/ui/card';

export function AgentCardSkeleton() {
  return (
    <Card className="p-6 lg:p-8 rounded-2xl border border-zinc-200 shadow-sm w-full">
      <div className="flex flex-col lg:flex-row items-start justify-between gap-8">
        {/* Left Section: Agent Info */}
        <div className="flex items-start gap-5 flex-1 w-full">
          {/* Agent Image Skeleton */}
          <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl bg-zinc-200 animate-pulse flex-shrink-0" />

          {/* Agent Details Skeleton */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-6 w-48 bg-zinc-200 rounded animate-pulse" />
              <div className="h-5 w-16 bg-zinc-200 rounded animate-pulse" />
            </div>
            <div className="h-4 w-full bg-zinc-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-3/4 bg-zinc-200 rounded animate-pulse mb-4" />
            <div className="h-4 w-32 bg-zinc-200 rounded animate-pulse mb-5" />

            {/* Action Buttons Skeleton */}
            <div className="flex flex-wrap items-center gap-2 mt-5">
              <div className="h-9 w-20 bg-zinc-200 rounded animate-pulse" />
              <div className="h-9 w-24 bg-zinc-200 rounded animate-pulse" />
              <div className="h-9 w-10 bg-zinc-200 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Right Section: Metrics Skeleton */}
        <div className="w-full lg:w-auto lg:min-w-[360px]">
          <div className="border border-zinc-200 rounded-xl bg-zinc-50/40 flex flex-col sm:flex-row overflow-hidden divide-y divide-zinc-200 sm:divide-y-0 sm:divide-x">
            {/* Requests Skeleton */}
            <div className="flex-1 px-5 py-4 sm:py-5 flex flex-col gap-1">
              <div className="h-3 w-16 bg-zinc-200 rounded animate-pulse" />
              <div className="h-8 w-12 bg-zinc-200 rounded animate-pulse" />
            </div>

            {/* Balance Skeleton */}
            <div className="flex-1 px-5 py-4 sm:py-5 flex flex-col gap-1">
              <div className="h-3 w-20 bg-zinc-200 rounded animate-pulse" />
              <div className="h-8 w-24 bg-zinc-200 rounded animate-pulse" />
            </div>

            {/* APIs Skeleton */}
            <div className="flex-1 px-5 py-4 sm:py-5 flex flex-col gap-1">
              <div className="h-3 w-12 bg-zinc-200 rounded animate-pulse" />
              <div className="h-8 w-8 bg-zinc-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

