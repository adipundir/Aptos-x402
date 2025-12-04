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
    { href: '/composer', label: 'Composer', icon: Bot },
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
              {item.label}
            </Button>
          </Link>
        );
      })}
    </>
  );
}
