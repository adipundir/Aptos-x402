'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Github, Package, PlayCircle, BookOpen, Bot, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const isActive = (path: string) => {
    if (path === '/docs') return pathname.startsWith('/docs');
    return pathname === path;
  };

  const navItems = [
    { href: '/composer', label: 'Composer', icon: Bot },
    { href: '/demo', label: 'Demo', icon: PlayCircle },
    { href: '/docs', label: 'Documentation', icon: BookOpen },
  ];

  return (
    <>
      {/* Mobile menu button */}
      <button
        aria-label="Toggle menu"
        aria-expanded={isOpen}
        className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/20 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile menu panel */}
      <div 
        className={`md:hidden fixed top-0 right-0 bottom-0 w-[280px] bg-white border-l border-zinc-200 z-50 transform transition-transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100">
          <span className="font-semibold text-zinc-900">Menu</span>
          <button
            onClick={() => setIsOpen(false)}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`
                  flex items-center gap-3 p-3 rounded-lg transition-colors
                  ${active 
                    ? 'bg-zinc-100 text-zinc-900' 
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="px-4">
          <div className="h-px bg-zinc-100" />
        </div>

        {/* External links */}
        <div className="p-4 space-y-1">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide px-3 mb-2">
            Resources
          </p>
          <a 
            href="https://github.com/adipundir/aptos-x402" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
          >
            <Github className="w-5 h-5" />
            <span className="font-medium">GitHub</span>
          </a>
          <a 
            href="https://www.npmjs.com/package/aptos-x402" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
          >
            <Package className="w-5 h-5" />
            <span className="font-medium">NPM Package</span>
          </a>
        </div>

        {/* Footer CTA */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-zinc-100">
          <Link href="/demo">
            <Button className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium h-11 rounded-lg">
              Try Demo
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}
