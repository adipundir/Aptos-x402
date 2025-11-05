'use client';

import { ScrollArea } from '@/components/ui/scroll-area';

export function ChatInterfaceSkeleton() {
  return (
    <div className="flex h-full min-h-[520px] flex-col rounded-lg border border-zinc-200 bg-white shadow-sm">
      {/* Header Skeleton */}
      <div className="border-b border-zinc-200 px-4 sm:px-6 py-3 sm:py-4 bg-white rounded-t-lg flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-zinc-200 animate-pulse flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-32 bg-zinc-200 rounded animate-pulse mb-2" />
              <div className="h-3 w-24 bg-zinc-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-9 w-20 bg-zinc-200 rounded animate-pulse flex-shrink-0" />
        </div>
      </div>

      {/* Settings Bar Skeleton */}
      <div className="border-b border-zinc-100 px-4 sm:px-6 py-2 sm:py-3 bg-zinc-50 flex-shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="h-8 w-40 bg-zinc-200 rounded animate-pulse" />
          <div className="h-8 w-32 bg-zinc-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Messages Area Skeleton */}
      <div className="flex-1 overflow-hidden bg-white">
        <ScrollArea className="h-full">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
            <div className="space-y-4 sm:space-y-6">
              {/* Message bubbles */}
              <div className="flex gap-2 sm:gap-4">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-200 animate-pulse flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-4 w-20 sm:w-24 bg-zinc-200 rounded animate-pulse mb-2" />
                  <div className="h-16 w-full bg-zinc-100 rounded-2xl animate-pulse" />
                </div>
              </div>
              <div className="flex gap-2 sm:gap-4 justify-end">
                <div className="flex-1 max-w-[85%] sm:max-w-[70%]">
                  <div className="h-4 w-16 sm:w-20 bg-zinc-200 rounded animate-pulse mb-2 ml-auto" />
                  <div className="h-20 w-full bg-zinc-200/80 rounded-2xl animate-pulse" />
                </div>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-200 animate-pulse flex-shrink-0" />
              </div>
              <div className="flex gap-2 sm:gap-4">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-200 animate-pulse flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-4 w-20 bg-zinc-200 rounded animate-pulse mb-2" />
                  <div className="h-12 w-3/4 bg-zinc-100 rounded-2xl animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Input Area Skeleton */}
      <div className="border-t border-zinc-200 px-4 sm:px-6 py-3 sm:py-4 bg-white rounded-b-lg flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-10 sm:h-12 bg-zinc-100 rounded-xl animate-pulse" />
            <div className="h-10 w-10 sm:h-11 sm:w-11 bg-zinc-200 rounded-xl animate-pulse" />
          </div>
          <div className="h-3 w-32 sm:w-40 bg-zinc-100 rounded-full animate-pulse mt-2 mx-auto" />
        </div>
      </div>
    </div>
  );
}

