#!/usr/bin/env tsx

/**
 * Initialize Aptos Account
 * 
 * This script initializes an account by sending a small transaction to itself.
 * This is needed when an account has funds but hasn't been initialized yet.
 */

import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

async function initializeAccount() {
  console.log("🔧 Initializing Aptos account...");
  
  const privateKey = process.env.DEMO_PRIVATE_KEY!;
  const network = process.env.APTOS_NETWORK!;
  
  if (!privateKey) {
    throw new Error("DEMO_PRIVATE_KEY is not set");
  }
  
  if (!network) {
    throw new Error("APTOS_NETWORK is not set");
  }
  
  console.log(`Network: ${network}`);
  
  // Map network to Aptos Network enum
  const networkMap: Record<string, Network> = {
    'aptos-mainnet': Network.MAINNET,
    'aptos-testnet': Network.TESTNET,
    'aptos-devnet': Network.DEVNET,
  };
  
  const aptosNetwork = networkMap[network] || Network.MAINNET;
  
  // Initialize Aptos client
  const config = new AptosConfig({ network: aptosNetwork });
  const aptos = new Aptos(config);
  
  // Create account from private key
  const privateKeyObj = new Ed25519PrivateKey(privateKey);
  const account = Account.fromPrivateKey({ privateKey: privateKeyObj });
  
  console.log(`Account address: ${account.accountAddress}`);
  
  // Check current balance
  try {
    const balance = await aptos.getAccountAPTAmount({ accountAddress: account.accountAddress });
    console.log(`Current balance: ${balance} APT`);
  } catch (error) {
    console.log("Account not initialized yet (this is expected)");
  }
  
  // Check if account exists
  try {
    const accountInfo = await aptos.getAccountInfo({ accountAddress: account.accountAddress });
    console.log(`Account sequence number: ${accountInfo.sequence_number}`);
    console.log("✅ Account is already initialized!");
    return;
  } catch (error) {
    console.log("Account needs initialization...");
  }
  
  // Initialize account by sending 0 APT to itself (this creates the account)
  console.log("🚀 Initializing account by sending 0 APT to itself...");
  
  try {
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: "0x1::aptos_account::transfer",
        functionArguments: [account.accountAddress, "0"], // Send 0 APT to self
      },
    });
    
    const committedTxn = await aptos.signAndSubmitTransaction({
      signer: account,
      transaction,
    });
    
    console.log("✅ Account initialized successfully!");
    console.log(`Transaction hash: ${committedTxn.hash}`);
    
    // Wait for confirmation
    await aptos.waitForTransaction({ transactionHash: committedTxn.hash });
    console.log("✅ Transaction confirmed!");
    
    // Check account info again
    const accountInfo = await aptos.getAccountInfo({ accountAddress: account.accountAddress });
    console.log(`New sequence number: ${accountInfo.sequence_number}`);
    
  } catch (error: any) {
    console.error("❌ Failed to initialize account:", error.message);
    throw error;
  }
}

// Run the script
initializeAccount().catch(console.error);
