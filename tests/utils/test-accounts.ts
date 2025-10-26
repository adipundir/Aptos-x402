/**
 * Test Accounts Management
 * 
 * Utilities for loading and managing test accounts from environment
 * and creating ephemeral accounts for testing.
 */

import {
  Account,
  Aptos,
  AptosConfig,
  Network,
  Ed25519PrivateKey,
} from "@aptos-labs/ts-sdk";

export interface TestAccount {
  account: Account;
  privateKey: string;
  address: string;
  network: Network;
}

/**
 * Load demo account from environment variables
 */
export function loadDemoAccount(network: Network = Network.TESTNET): TestAccount {
  const privateKey = process.env.DEMO_PRIVATE_KEY;
  const address = process.env.DEMO_ADDRESS;
  
  if (!privateKey) {
    throw new Error('DEMO_PRIVATE_KEY not found in environment');
  }
  
  if (!address) {
    throw new Error('DEMO_ADDRESS not found in environment');
  }
  
  const cleanKey = privateKey.replace(/^0x/, "");
  const account = Account.fromPrivateKey({
    privateKey: new Ed25519PrivateKey(cleanKey)
  });
  
  return {
    account,
    privateKey: cleanKey,
    address,
    network,
  };
}

/**
 * Load payment recipient address from environment
 */
export function loadRecipientAddress(): string {
  const address = process.env.PAYMENT_RECIPIENT_ADDRESS;
  
  if (!address) {
    throw new Error('PAYMENT_RECIPIENT_ADDRESS not found in environment');
  }
  
  return address;
}

/**
 * Load facilitator URL from environment
 */
export function loadFacilitatorUrl(): string {
  const url = process.env.FACILITATOR_URL;
  
  if (!url) {
    throw new Error('FACILITATOR_URL not found in environment');
  }
  
  return url;
}

/**
 * Create an ephemeral test account (not funded)
 */
export function createEphemeralAccount(network: Network = Network.TESTNET): TestAccount {
  const account = Account.generate();
  
  return {
    account,
    privateKey: account.privateKey.toString().replace(/^0x/, ""),
    address: account.accountAddress.toString(),
    network,
  };
}

/**
 * Fund an account from the testnet faucet
 */
export async function fundAccount(
  address: string,
  amount: number = 100_000_000, // 1 APT
  network: Network = Network.TESTNET
): Promise<boolean> {
  if (network !== Network.TESTNET) {
    throw new Error('Can only fund accounts on testnet');
  }
  
  try {
    const config = new AptosConfig({ network });
    const aptos = new Aptos(config);
    
    await aptos.fundAccount({
      accountAddress: address,
      amount,
    });
    
    console.log(`✅ Funded ${address} with ${amount / 100_000_000} APT`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to fund account:`, error);
    return false;
  }
}

/**
 * Check if an account has sufficient balance for payment + gas
 */
export async function hasSufficientBalance(
  address: string,
  requiredAmount: string, // in Octas
  network: Network = Network.TESTNET
): Promise<boolean> {
  const config = new AptosConfig({ network });
  const aptos = new Aptos(config);
  
  try {
    const balance = await aptos.getAccountAPTAmount({
      accountAddress: address,
    });
    
    const required = parseInt(requiredAmount);
    const gasBuffer = 10000; // Buffer for gas fees
    
    const sufficient = balance >= (required + gasBuffer);
    
    if (!sufficient) {
      console.warn(`⚠️  Insufficient balance: ${balance} Octas < ${required + gasBuffer} Octas (payment + gas)`);
    }
    
    return sufficient;
  } catch (error) {
    console.error(`❌ Failed to check balance:`, error);
    return false;
  }
}

/**
 * Get account balance in Octas
 */
export async function getBalance(
  address: string,
  network: Network = Network.TESTNET
): Promise<number> {
  const config = new AptosConfig({ network });
  const aptos = new Aptos(config);
  
  try {
    return await aptos.getAccountAPTAmount({
      accountAddress: address,
    });
  } catch (error) {
    console.error(`❌ Failed to get balance:`, error);
    return 0;
  }
}

/**
 * Ensure demo account has sufficient balance for tests
 */
export async function ensureDemoAccountFunded(
  minBalance: number = 10_000_000 // 0.1 APT
): Promise<TestAccount> {
  const demoAccount = loadDemoAccount();
  const balance = await getBalance(demoAccount.address);
  
  if (balance < minBalance) {
    console.log(`⚠️  Demo account balance too low: ${balance / 100_000_000} APT`);
    console.log(`Attempting to fund from faucet...`);
    
    const funded = await fundAccount(demoAccount.address);
    if (!funded) {
      throw new Error(
        `Failed to fund demo account. Please fund manually at: ` +
        `https://aptoslabs.com/testnet-faucet?address=${demoAccount.address}`
      );
    }
  } else {
    console.log(`✅ Demo account has sufficient balance: ${balance / 100_000_000} APT`);
  }
  
  return demoAccount;
}

/**
 * Validate environment configuration for tests
 */
export function validateTestEnvironment(): void {
  const errors: string[] = [];
  
  if (!process.env.DEMO_PRIVATE_KEY) {
    errors.push('Missing DEMO_PRIVATE_KEY');
  }
  
  if (!process.env.DEMO_ADDRESS) {
    errors.push('Missing DEMO_ADDRESS');
  }
  
  if (!process.env.PAYMENT_RECIPIENT_ADDRESS) {
    errors.push('Missing PAYMENT_RECIPIENT_ADDRESS');
  }
  
  if (!process.env.FACILITATOR_URL) {
    errors.push('Missing FACILITATOR_URL');
  }
  
  if (errors.length > 0) {
    throw new Error(
      `Test environment not configured:\n` +
      errors.map(e => `  - ${e}`).join('\n') +
      `\n\nPlease set up .env file with required variables.`
    );
  }
  
  console.log('✅ Test environment validated');
}

/**
 * Get test configuration summary
 */
export function getTestConfig() {
  return {
    demoAddress: process.env.DEMO_ADDRESS,
    recipientAddress: process.env.PAYMENT_RECIPIENT_ADDRESS,
    facilitatorUrl: process.env.FACILITATOR_URL,
    network: process.env.APTOS_NETWORK || 'testnet',
  };
}


