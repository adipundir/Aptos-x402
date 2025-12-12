'use client';

import { PlayCircle, BookOpen, Bot } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function NavLinks() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    if (path === '/docs') return pathname.startsWith('/docs');
    return pathname === path;
  };

  const navItems = [
    { href: '/composer', label: 'Composer', icon: Bot, beta: true },
    { href: '/demo', label: 'Demo', icon: PlayCircle },
    { href: '/docs', label: 'Docs', icon: BookOpen },
  ];

  return (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link key={item.href} href={item.href}>
            <Button
              variant="ghost"
              size="sm"
              className={`
                relative px-4 py-2 font-medium transition-colors
                ${active 
                  ? 'text-zinc-900 bg-zinc-100' 
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }
              `}
            >
              <Icon className="w-4 h-4 mr-2" />
              <span className="flex items-center gap-2">
                {item.label}
                {item.beta && (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                    Beta
                  </span>
                )}
              </span>
            </Button>
          </Link>
        );
      })}
    </>
  );
}
