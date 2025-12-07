import { Github, Package } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/auth/UserMenu';
import { MobileMenu } from './MobileMenu';
import { NavLinks } from './NavLinks';

export default async function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="glass border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            {/* Logo */}
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
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-zinc-900 leading-none">
                  Aptos x402
                </span>
                <span className="text-[10px] font-medium text-zinc-500 tracking-wide">
                  Payment Protocol
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <NavLinks />

              {/* Divider */}
              <div className="w-px h-6 bg-zinc-200 mx-2" />

              {/* External Links */}
              <a 
                href="https://github.com/adipundir/aptos-x402" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 px-3"
                >
                  <Github className="w-4 h-4" />
                </Button>
              </a>
              <a 
                href="https://www.npmjs.com/package/aptos-x402" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 px-3"
                >
                  <Package className="w-4 h-4" />
                </Button>
              </a>

              {/* Divider */}
              <div className="w-px h-6 bg-zinc-200 mx-2" />
              
              {/* User menu - server rendered */}
              <UserMenu />
            </nav>

            {/* Mobile menu */}
            <MobileMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
