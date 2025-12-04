'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Github, Package, PlayCircle, BookOpen, Bot, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        aria-label="Toggle menu"
        className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 transition"
        onClick={() => setIsOpen((v) => !v)}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile dropdown */}
      {isOpen && (
        <div className="sm:hidden fixed top-16 left-0 right-0 border-t border-zinc-200 bg-white px-4 pb-4 shadow-lg">
          <div className="flex flex-col pt-3 gap-1">
            <Link href="/composer" onClick={() => setIsOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-zinc-700 hover:text-zinc-900"
              >
                <Bot className="w-4 h-4 mr-2" />
                Composer
              </Button>
            </Link>
            <Link href="/demo" onClick={() => setIsOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-zinc-700 hover:text-zinc-900"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Demo
              </Button>
            </Link>
            <Link href="/docs" onClick={() => setIsOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-zinc-700 hover:text-zinc-900"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Docs
              </Button>
            </Link>
            <a 
              href="https://github.com/adipundir/aptos-x402" 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
            >
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-zinc-700 hover:text-zinc-900"
              >
                <Github className="w-4 h-4 mr-2" />
                GitHub
              </Button>
            </a>
            <a 
              href="https://www.npmjs.com/package/aptos-x402" 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
            >
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-zinc-700 hover:text-zinc-900"
              >
                <Package className="w-4 h-4 mr-2" />
                NPM
              </Button>
            </a>
          </div>
        </div>
      )}
    </>
  );
}

