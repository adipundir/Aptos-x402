/**
 * Aptos Utilities for x402
 * 
 * Utilities for building, signing, and submitting Aptos transactions.
 */

import {
  Aptos,
  AptosConfig,
  Network,
  Account,
  Ed25519PrivateKey,
  SimpleTransaction,
  AccountAuthenticator,
} from "@aptos-labs/ts-sdk";

import { parseCAIP2Network } from "./x402-protocol-types";

// ============================================
// TYPES
// ============================================

export interface FeePayerTransactionResult {
  transaction: SimpleTransaction;
  senderAuthenticator: AccountAuthenticator;
}

// ============================================
// CLIENT MANAGEMENT
// ============================================

/**
 * Get Aptos client based on network (CAIP-2 format)
 */
export function getAptosClient(network: string = "aptos:2"): Aptos {
  const parsed = parseCAIP2Network(network);
  const aptosNetwork = parsed?.chainId === '1' ? Network.MAINNET : Network.TESTNET;

  return new Aptos(new AptosConfig({ network: aptosNetwork }));
}

/**
 * Create an Account from a private key
 */
export function getAccountFromPrivateKey(privateKeyHex: string): Account {
  const cleanKey = privateKeyHex.replace(/^0x/, "");
  return Account.fromPrivateKey({ privateKey: new Ed25519PrivateKey(cleanKey) });
}

// ============================================
// TRANSACTION BUILDING (Fungible Assets Only)
// ============================================

/**
 * Build a sponsored fungible asset transfer transaction
 */
export async function buildFeePayerFATransfer(
  aptos: Aptos,
  sender: Account,
  recipient: string,
  amount: string | bigint,
  assetMetadata: string
): Promise<SimpleTransaction> {
  return await aptos.transaction.build.simple({
    sender: sender.accountAddress,
    withFeePayer: true,
    data: {
      function: "0x1::primary_fungible_store::transfer",
      typeArguments: ["0x1::fungible_asset::Metadata"],
      functionArguments: [assetMetadata, recipient, BigInt(amount.toString())],
    },
  });
}

// ============================================
// TRANSACTION SIGNING
// ============================================

/**
 * Sign a transaction as the sender
 */
export function signAsSender(
  aptos: Aptos,
  signer: Account,
  transaction: SimpleTransaction
): AccountAuthenticator {
  return aptos.transaction.sign({ signer, transaction });
}

// ============================================
// TRANSACTION SUBMISSION
// ============================================

/**
 * Submit a transaction with sender signature
 */
export async function submitTransaction(
  aptos: Aptos,
  transaction: SimpleTransaction,
  senderAuthenticator: AccountAuthenticator
): Promise<string> {
  const committed = await aptos.transaction.submit.simple({
    transaction,
    senderAuthenticator,
  });
  return committed.hash;
}

// ============================================
// ACCOUNT UTILITIES
// ============================================

/**
 * Get fungible asset balance
 */
export async function getFungibleAssetBalance(
  aptos: Aptos,
  accountAddress: string,
  assetMetadata: string
): Promise<string> {
  try {
    const balances = await aptos.getCurrentFungibleAssetBalances({
      options: {
        where: {
          owner_address: { _eq: accountAddress },
          asset_type: { _eq: assetMetadata },
        },
      },
    });
    return balances.length > 0 ? balances[0].amount.toString() : "0";
  } catch {
    return "0";
  }
}

/**
 * Check if an account exists on chain
 */
export async function accountExists(
  aptos: Aptos,
  accountAddress: string
): Promise<boolean> {
  try {
    await aptos.getAccountInfo({ accountAddress });
    return true;
  } catch {
    return false;
  }
}

// ============================================
// NETWORK UTILITIES
// ============================================

/**
 * Get chain ID from CAIP-2 network
 */
export function getChainId(network: string): number {
  const parsed = parseCAIP2Network(network);
  if (parsed?.chainId) {
    const id = parseInt(parsed.chainId, 10);
    if (!isNaN(id)) return id;
  }
  return 2; // Default testnet
}

/**
 * Get CAIP-2 network from chain ID
 */
export function getNetworkFromChainId(chainId: number): string {
  return `aptos:${chainId}`;
}
