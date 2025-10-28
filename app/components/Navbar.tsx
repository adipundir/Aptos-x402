'use client';

import { Github, Package } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  return (
    <div className="fixed top-0 left-0 right-0 h-16 border-b border-zinc-200 bg-white z-50">
      <div className="max-w-full px-6 h-full flex items-center justify-between">
        <a 
          href="/" 
          className="flex items-center gap-3 group"
        >
          <Image
            src="/logo_dark.svg"
            alt="Aptos x402 Logo"
            width={32}
            height={32}
            priority
          />
          <span className="text-2xl font-semibold tracking-tight bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-600 bg-clip-text text-transparent group-hover:from-zinc-700 group-hover:via-zinc-600 group-hover:to-zinc-500 transition-all" style={{ fontFamily: 'Impact, "Arial Black", sans-serif' }}>
            Aptos x402
          </span>
        </a>
        
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-700 hover:text-zinc-900"
            onClick={() => window.open('https://github.com/adipundir/aptos-x402', '_blank')}
          >
            <Github className="w-4 h-4 mr-2" />
            GitHub
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-700 hover:text-zinc-900"
            onClick={() => window.open('https://www.npmjs.com/package/@adipundir/aptos-x402', '_blank')}
          >
            <Package className="w-4 h-4 mr-2" />
            NPM
          </Button>
          <Button
            size="sm"
            className="bg-zinc-900 text-white hover:bg-zinc-800"
            onClick={() => window.location.href = '/docs'}
          >
            Documentation
          </Button>
        </div>
      </div>
    </div>
  );
}

