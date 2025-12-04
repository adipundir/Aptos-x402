import { Github, Package, PlayCircle, BookOpen, Bot } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/auth/UserMenu';
import { MobileMenu } from './MobileMenu';

export default async function Navbar() {
  return (
    <div className="fixed top-0 left-0 right-0 h-16 border-b border-zinc-200 bg-white z-50">
      <div className="max-w-full px-6 h-full flex items-center justify-between">
        <Link
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
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-3">
          <Link href="/composer">
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-700 hover:text-zinc-900"
            >
              <Bot className="w-4 h-4 mr-2" />
              Composer
            </Button>
          </Link>
          <Link href="/demo">
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-700 hover:text-zinc-900"
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Demo
            </Button>
          </Link>
          <Link href="/docs">
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-700 hover:text-zinc-900"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Docs
            </Button>
          </Link>
          <a href="https://github.com/adipundir/aptos-x402" target="_blank" rel="noopener noreferrer">
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-700 hover:text-zinc-900"
            >
              <Github className="w-4 h-4 mr-2" />
              GitHub
            </Button>
          </a>
          <a href="https://www.npmjs.com/package/aptos-x402" target="_blank" rel="noopener noreferrer">
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-700 hover:text-zinc-900"
            >
              <Package className="w-4 h-4 mr-2" />
              NPM
            </Button>
          </a>
          
          {/* User menu - server rendered */}
          <div className="ml-2 pl-2 border-l border-zinc-200">
            <UserMenu />
          </div>
        </div>

        {/* Mobile menu - client component */}
        <MobileMenu />
      </div>
    </div>
  );
}
