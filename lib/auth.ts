/**
 * NextAuth.js Configuration
 * Google OAuth provider with Drizzle adapter
 */

import NextAuth, { type Session } from 'next-auth';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import { users, accounts, sessions, verificationTokens } from '@/lib/db/schema';

// Debug: Check if required env vars are set
if (!process.env.AUTH_SECRET) {
  console.error('⚠️  AUTH_SECRET is not set in environment variables!');
}

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('⚠️  Google OAuth credentials are missing!');
} else {
  console.log('✅ Google OAuth configured');
}

const authConfig = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  // Use DrizzleAdapter with correct table mappings
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
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
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign in, store user ID
      if (user && user.id) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        (session.user as any).id = token.userId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  debug: process.env.NODE_ENV === 'development',
});

export const { handlers, signIn, signOut, auth } = authConfig;

// Extended session type for use in the app
export interface ExtendedSession extends Session {
  user: Session['user'] & {
    id: string;
  };
}
