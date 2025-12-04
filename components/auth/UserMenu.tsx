'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogOut, Wallet, User, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { LoginModal } from './LoginModal';

export function UserMenu() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (status === 'loading') {
    return (
      <div className="h-9 w-9 rounded-full bg-zinc-200 animate-pulse" />
    );
  }

  if (!session) {
    return (
      <>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-zinc-200"
          onClick={() => setLoginModalOpen(true)}
        >
          Sign In
        </Button>
        <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} />
      </>
    );
  }

  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors"
      >
        {session.user?.image ? (
          <img
            src={session.user.image}
            alt={session.user.name || 'User'}
            className="w-7 h-7 rounded-full"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center text-white text-sm font-medium">
            {session.user?.name?.charAt(0) || 'U'}
          </div>
        )}
        <span className="text-sm font-medium text-zinc-900 hidden sm:inline">
          {session.user?.name?.split(' ')[0] || 'User'}
        </span>
        <ChevronDown className="w-4 h-4 text-zinc-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white shadow-lg border border-zinc-200 py-2 z-50">
          <div className="px-4 py-3 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              {session.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-white font-medium">
                  {session.user?.name?.charAt(0) || 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">
                  {session.user?.name || 'User'}
                </p>
                <p className="text-xs text-zinc-500 truncate">
                  {session.user?.email}
                </p>
              </div>
            </div>
          </div>

          {session.user?.paymentWallet && (
            <div className="px-4 py-3 border-b border-zinc-100">
              <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                <Wallet className="w-3.5 h-3.5" />
                Payment Wallet
              </div>
              <p className="text-sm font-mono text-zinc-900">
                {truncateAddress(session.user.paymentWallet)}
              </p>
            </div>
          )}

          <div className="px-2 py-2">
            <Link
              href="/composer"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              <User className="w-4 h-4 text-zinc-500" />
              <span className="text-sm text-zinc-700">My Agents</span>
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors text-red-600"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

