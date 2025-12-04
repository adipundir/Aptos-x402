/**
 * Payment Wallet Storage
 * One payment wallet per user (shared across all agents)
 */

import { db, paymentWallets, type PaymentWallet, type NewPaymentWallet } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { Account, Aptos, AptosConfig, Network, AccountAddress } from '@aptos-labs/ts-sdk';
import { encryptPrivateKey, decryptPrivateKey } from '@/lib/encryption';

// Cache Aptos client
let aptosClient: Aptos | null = null;

function getAptosClient(): Aptos {
  if (!aptosClient) {
    const network = process.env.APTOS_NETWORK === 'aptos-mainnet' ? Network.MAINNET : Network.TESTNET;
    aptosClient = new Aptos(new AptosConfig({ network }));
  }
  return aptosClient;
}

/**
 * Generate a new Aptos wallet
 */
export function generateWallet() {
  const account = Account.generate();
  return {
    address: account.accountAddress.toString(),
    privateKey: account.privateKey.toString(),
    publicKey: account.publicKey.toString(),
  };
}

/**
 * Get or create payment wallet for a user
 * Creates a new wallet on first call, returns existing on subsequent calls
 */
export async function getOrCreatePaymentWallet(userId: string): Promise<{ address: string; isNew: boolean }> {
  // Check if wallet exists
  const [existing] = await db
    .select()
    .from(paymentWallets)
    .where(eq(paymentWallets.userId, userId))
    .limit(1);

  if (existing) {
    return {
      address: existing.walletAddress,
      isNew: false,
    };
  }

  // Generate new wallet
  const wallet = generateWallet();
  
  // Encrypt private key
  const encrypted = encryptPrivateKey(wallet.privateKey);

  // Store in database
  const walletId = `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  await db.insert(paymentWallets).values({
    id: walletId,
    userId: userId,
    walletAddress: wallet.address,
    privateKeyEncrypted: encrypted.encrypted,
    privateKeyIV: encrypted.iv,
    privateKeyTag: encrypted.tag,
    isActive: 'true',
  });

  console.log(`[Payment Wallet] Created new wallet for user ${userId}: ${wallet.address}`);

  return {
    address: wallet.address,
    isNew: true,
  };
}

/**
 * Get payment wallet address for a user (public, safe to return to client)
 */
export async function getPaymentWalletAddress(userId: string): Promise<string | null> {
  const [wallet] = await db
    .select({ walletAddress: paymentWallets.walletAddress })
    .from(paymentWallets)
    .where(eq(paymentWallets.userId, userId))
    .limit(1);

  return wallet?.walletAddress || null;
}

/**
 * Get payment wallet with all details (server-side only)
 */
export async function getPaymentWallet(userId: string): Promise<PaymentWallet | null> {
  const [wallet] = await db
    .select()
    .from(paymentWallets)
    .where(eq(paymentWallets.userId, userId))
    .limit(1);

  return wallet || null;
}

/**
 * Get payment wallet private key (for API calls - server-side only!)
 * This decrypts the key on-demand and should never be stored
 */
export async function getPaymentWalletPrivateKey(userId: string): Promise<string> {
  const wallet = await getPaymentWallet(userId);

  if (!wallet) {
    throw new Error('Payment wallet not found. Please sign in to create one.');
  }

  if (wallet.isActive !== 'true') {
    throw new Error('Payment wallet is not active.');
  }

  // Decrypt private key
  return decryptPrivateKey(
    wallet.privateKeyEncrypted,
    wallet.privateKeyIV,
    wallet.privateKeyTag
  );
}

/**
 * Get payment wallet balance
 */
export async function getPaymentWalletBalance(userId: string): Promise<{
  balanceAPT: string;
  balanceOctas: string;
  address: string | null;
}> {
  const wallet = await getPaymentWallet(userId);

  if (!wallet) {
    return {
      balanceAPT: '0.00000000',
      balanceOctas: '0',
      address: null,
    };
  }

  try {
    const aptos = getAptosClient();
    const balance = await aptos.getAccountAPTAmount({
      accountAddress: AccountAddress.fromString(wallet.walletAddress),
    });

    return {
      balanceAPT: (balance / 100_000_000).toFixed(8),
      balanceOctas: balance.toString(),
      address: wallet.walletAddress,
    };
  } catch (error: any) {
    // Account might not exist on chain yet (no balance)
    if (error.message?.includes('Account not found')) {
      return {
        balanceAPT: '0.00000000',
        balanceOctas: '0',
        address: wallet.walletAddress,
      };
    }
    console.error('Error fetching wallet balance:', error);
    return {
      balanceAPT: '0.00000000',
      balanceOctas: '0',
      address: wallet.walletAddress,
    };
  }
}

/**
 * Fund wallet from faucet (testnet only)
 */
export async function fundWalletFromFaucet(userId: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
  const wallet = await getPaymentWallet(userId);

  if (!wallet) {
    return { success: false, error: 'Wallet not found' };
  }

  if (process.env.APTOS_NETWORK === 'aptos-mainnet') {
    return { success: false, error: 'Faucet is only available on testnet' };
  }

  try {
    const aptos = getAptosClient();
    await aptos.fundAccount({
      accountAddress: AccountAddress.fromString(wallet.walletAddress),
      amount: 100_000_000, // 1 APT
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error funding wallet:', error);
    return { success: false, error: error.message || 'Failed to fund wallet' };
  }
}
