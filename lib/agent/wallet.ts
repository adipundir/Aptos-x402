/**
 * Agent Wallet Utilities
 * Wallet generation and balance management for agents
 */

import { Account, Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { getAptosClient } from '../aptos-utils';

export interface WalletInfo {
  address: string;
  balance: string; // In Octas
  balanceAPT: string; // In APT (formatted)
}

/**
 * Generate a new Aptos wallet for an agent
 */
export function generateAgentWallet(): { account: Account; address: string; privateKey: string } {
  const account = Account.generate();
  return {
    account,
    address: account.accountAddress.toString(),
    privateKey: account.privateKey.toString(),
  };
}

/**
 * Get wallet balance
 */
export async function getWalletBalance(
  address: string,
  network: 'testnet' | 'mainnet' = 'testnet'
): Promise<WalletInfo> {
  const aptos = getAptosClient(network);
  
  try {
    const balance = await aptos.getAccountAPTAmount({
      accountAddress: address,
    });
    
    const balanceString = balance.toString();
    const balanceAPT = (balance / 100_000_000).toFixed(8);
    
    return {
      address,
      balance: balanceString,
      balanceAPT,
    };
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return {
      address,
      balance: '0',
      balanceAPT: '0.00000000',
    };
  }
}

/**
 * Check if wallet has sufficient balance for a transaction
 */
export async function hasSufficientBalance(
  address: string,
  requiredAmount: string, // In Octas
  network: 'testnet' | 'mainnet' = 'testnet'
): Promise<boolean> {
  const walletInfo = await getWalletBalance(address, network);
  const balance = BigInt(walletInfo.balance);
  const required = BigInt(requiredAmount);
  return balance >= required;
}

/**
 * Fund account from testnet faucet (for development)
 */
export async function fundFromFaucet(
  address: string,
  amount: number = 100_000_000 // 1 APT default
): Promise<boolean> {
  try {
    const config = new AptosConfig({ network: Network.TESTNET });
    const aptos = new Aptos(config);
    
    await aptos.fundAccount({
      accountAddress: address,
      amount,
    });
    
    return true;
  } catch (error) {
    console.error('Error funding account from faucet:', error);
    return false;
  }
}


