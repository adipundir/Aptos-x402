/**
 * User Wallet Storage
 * Manages user wallets for API payments
 * Each user gets their own wallet to pay for API calls
 */

import { db, userWallets, type UserWallet, type NewUserWallet } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { generateAgentWallet } from '@/lib/agent/wallet';

/**
 * Get or create a wallet for a user
 * If user doesn't have a wallet, creates one automatically
 */
export async function getOrCreateUserWallet(userId: string): Promise<UserWallet> {
  const result = await db
    .select()
    .from(userWallets)
    .where(eq(userWallets.userId, userId))
    .limit(1);
  
  if (result.length > 0) {
    return result[0];
  }
  
  // Create new wallet for user
  const { address, privateKey } = generateAgentWallet();
  const newWallet: NewUserWallet = {
    userId,
    walletAddress: address,
    privateKey,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  const [created] = await db.insert(userWallets).values(newWallet).returning();
  return created;
}

/**
 * Get user wallet by userId
 */
export async function getUserWallet(userId: string): Promise<UserWallet | null> {
  const result = await db
    .select()
    .from(userWallets)
    .where(eq(userWallets.userId, userId))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Get wallet address for a user (client-safe, no private key)
 */
export async function getUserWalletAddress(userId: string): Promise<string | null> {
  const wallet = await getUserWallet(userId);
  return wallet?.walletAddress || null;
}

