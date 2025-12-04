/**
 * NextAuth.js Configuration
 * Google and GitHub OAuth providers
 */

import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db, users, accounts, sessions, verificationTokens } from '@/lib/db';
import { getOrCreatePaymentWallet } from '@/lib/storage/payment-wallets';

// Debug: Check if required env vars are set
if (!process.env.AUTH_SECRET) {
  console.error('⚠️  AUTH_SECRET is not set in environment variables!');
  console.error('Add AUTH_SECRET=your-secret to your .env file');
}

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('⚠️  Google OAuth credentials are missing!');
  console.error('Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file');
} else {
  console.log('✅ Google OAuth configured');
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET || 'fallback-dev-secret-change-in-production',
  trustHost: true, // Required for Vercel and some hosting providers
  adapter: DrizzleAdapter(db, { users, accounts, sessions, verificationTokens }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // On initial sign in, create payment wallet
      if (user && user.id) {
        token.userId = user.id;
        
        // Create payment wallet for new users
        try {
          const wallet = await getOrCreatePaymentWallet(user.id);
          token.paymentWallet = wallet.address;
        } catch (error) {
          console.error('Failed to create payment wallet:', error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      if (token.paymentWallet) {
        session.user.paymentWallet = token.paymentWallet as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  events: {
    async createUser({ user }) {
      // Create payment wallet when user first signs up
      if (user.id) {
        try {
          await getOrCreatePaymentWallet(user.id);
          console.log(`Payment wallet created for user: ${user.id}`);
        } catch (error) {
          console.error('Failed to create payment wallet on signup:', error);
        }
      }
    },
  },
});

// Extend the Session type to include our custom properties
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      paymentWallet?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    paymentWallet?: string;
  }
}
