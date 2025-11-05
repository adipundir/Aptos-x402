'use client';

import { Github, Package, PlayCircle, BookOpen, Bot, Menu, X } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

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

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-700 hover:text-zinc-900"
            onClick={() => window.location.href = '/composer'}
          >
            <Bot className="w-4 h-4 mr-2" />
            Composer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-700 hover:text-zinc-900"
            onClick={() => window.location.href = '/demo'}
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            Demo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-700 hover:text-zinc-900"
            onClick={() => window.location.href = '/docs'}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Docs
          </Button>
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
            onClick={() => window.open('https://www.npmjs.com/package/aptos-x402', '_blank')}
          >
            <Package className="w-4 h-4 mr-2" />
            NPM
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          aria-label="Toggle menu"
          className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 transition"
          onClick={() => setIsOpen((v) => !v)}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {isOpen && (
        <div className="sm:hidden border-t border-zinc-200 bg-white px-4 pb-4">
          <div className="flex flex-col pt-3 gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="justify-start text-zinc-700 hover:text-zinc-900"
              onClick={() => { setIsOpen(false); window.location.href = '/composer'; }}
            >
              <Bot className="w-4 h-4 mr-2" />
              Composer
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start text-zinc-700 hover:text-zinc-900"
              onClick={() => { setIsOpen(false); window.location.href = '/demo'; }}
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Demo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start text-zinc-700 hover:text-zinc-900"
              onClick={() => { setIsOpen(false); window.location.href = '/docs'; }}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Docs
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start text-zinc-700 hover:text-zinc-900"
              onClick={() => { setIsOpen(false); window.open('https://github.com/adipundir/aptos-x402', '_blank'); }}
            >
              <Github className="w-4 h-4 mr-2" />
              GitHub
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start text-zinc-700 hover:text-zinc-900"
              onClick={() => { setIsOpen(false); window.open('https://www.npmjs.com/package/aptos-x402', '_blank'); }}
            >
              <Package className="w-4 h-4 mr-2" />
              NPM
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

