/**
 * Agent Wallet Storage
 * One wallet per agent with encrypted private key storage
 */

import { db, agentWallets, type AgentWallet, type NewAgentWallet } from '@/lib/db';
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
 * Create a wallet for an agent
 * Called when creating a new agent
 */
export async function createAgentWallet(agentId: string): Promise<{ address: string; publicKey: string }> {
  // Check if wallet already exists
  const [existing] = await db
    .select()
    .from(agentWallets)
    .where(eq(agentWallets.agentId, agentId))
    .limit(1);

  if (existing) {
    return {
      address: existing.walletAddress,
      publicKey: existing.publicKey,
    };
  }

  // Generate new wallet
  const wallet = generateWallet();
  
  // Encrypt private key
  const encrypted = encryptPrivateKey(wallet.privateKey);

  // Store in database
  const walletId = `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  await db.insert(agentWallets).values({
    id: walletId,
    agentId: agentId,
    walletAddress: wallet.address,
    publicKey: wallet.publicKey,
    privateKeyEncrypted: encrypted.encrypted,
    privateKeyIV: encrypted.iv,
    privateKeyTag: encrypted.tag,
  });

  console.log(`[Agent Wallet] Created wallet for agent ${agentId}: ${wallet.address}`);

  return {
    address: wallet.address,
    publicKey: wallet.publicKey,
  };
}

/**
 * Get agent wallet by agent ID (public info only)
 */
export async function getAgentWalletPublic(agentId: string): Promise<{ address: string; publicKey: string } | null> {
  const [wallet] = await db
    .select({
      walletAddress: agentWallets.walletAddress,
      publicKey: agentWallets.publicKey,
    })
    .from(agentWallets)
    .where(eq(agentWallets.agentId, agentId))
    .limit(1);

  if (!wallet) return null;
  
  return {
    address: wallet.walletAddress,
    publicKey: wallet.publicKey,
  };
}

/**
 * Get agent wallet with all details (server-side only)
 */
export async function getAgentWallet(agentId: string): Promise<AgentWallet | null> {
  const [wallet] = await db
    .select()
    .from(agentWallets)
    .where(eq(agentWallets.agentId, agentId))
    .limit(1);

  return wallet || null;
}

/**
 * Get agent wallet private key (for API calls - server-side only!)
 * This decrypts the key on-demand and should never be stored or returned to client
 */
export async function getAgentWalletPrivateKey(agentId: string): Promise<string> {
  const wallet = await getAgentWallet(agentId);

  if (!wallet) {
    throw new Error(`Wallet not found for agent: ${agentId}`);
  }

  // Decrypt private key
  return decryptPrivateKey(
    wallet.privateKeyEncrypted,
    wallet.privateKeyIV,
    wallet.privateKeyTag
  );
}

/**
 * Get agent wallet balance
 */
export async function getAgentWalletBalance(agentId: string): Promise<{
  balanceAPT: string;
  balanceOctas: string;
  address: string | null;
  publicKey: string | null;
}> {
  const wallet = await getAgentWallet(agentId);

  if (!wallet) {
    return {
      balanceAPT: '0.00000000',
      balanceOctas: '0',
      address: null,
      publicKey: null,
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
      publicKey: wallet.publicKey,
    };
  } catch (error: any) {
    // Account might not exist on chain yet (no balance)
    if (error.message?.includes('Account not found') || error.message?.includes('not found')) {
      return {
        balanceAPT: '0.00000000',
        balanceOctas: '0',
        address: wallet.walletAddress,
        publicKey: wallet.publicKey,
      };
    }
    console.error('Error fetching wallet balance:', error);
    return {
      balanceAPT: '0.00000000',
      balanceOctas: '0',
      address: wallet.walletAddress,
      publicKey: wallet.publicKey,
    };
  }
}

/**
 * Fund agent wallet from faucet (testnet only)
 */
export async function fundAgentWalletFromFaucet(agentId: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
  const wallet = await getAgentWallet(agentId);

  if (!wallet) {
    return { success: false, error: 'Agent wallet not found' };
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
    console.error('Error funding agent wallet:', error);
    return { success: false, error: error.message || 'Failed to fund wallet' };
  }
}

/**
 * Delete agent wallet (called when agent is deleted)
 */
export async function deleteAgentWallet(agentId: string): Promise<boolean> {
  const result = await db
    .delete(agentWallets)
    .where(eq(agentWallets.agentId, agentId))
    .returning();
  
  return result.length > 0;
}

