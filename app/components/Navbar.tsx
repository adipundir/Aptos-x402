'use client';

import { Github, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  return (
    <div className="fixed top-0 left-0 right-0 h-16 border-b border-zinc-200 bg-white z-50">
      <div className="max-w-full px-6 h-full flex items-center justify-between">
        <a 
          href="/" 
          className="flex items-center gap-2 text-2xl font-bold text-zinc-900 hover:text-zinc-700 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-white text-sm font-bold">
            A
          </div>
          Aptos x402
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

