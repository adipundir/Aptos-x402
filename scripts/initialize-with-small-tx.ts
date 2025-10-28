#!/usr/bin/env tsx

/**
 * Initialize Account with Small Transaction
 * 
 * This script tries to initialize the account by sending a very small amount.
 */

import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

async function initializeWithSmallTx() {
  console.log("🔧 Initializing account with small transaction...");
  
  const privateKey = "0x21c31d63f7719d3de90b9c14b264229db65609f11f86413cb81a7ed7fcb18f3f";
  
  // Initialize Aptos client
  const config = new AptosConfig({ 
    network: Network.MAINNET,
    fullnode: "https://fullnode.mainnet.aptoslabs.com/v1"
  });
  const aptos = new Aptos(config);
  
  // Create account from private key
  const privateKeyObj = new Ed25519PrivateKey(privateKey);
  const account = Account.fromPrivateKey({ privateKey: privateKeyObj });
  
  console.log(`Account: ${account.accountAddress.toString()}`);
  
  // Check if account has any resources
  try {
    const resources = await aptos.getAccountResources({ accountAddress: account.accountAddress });
    console.log(`Resources: ${resources.length}`);
    
    if (resources.length === 0) {
      console.log("❌ Account has no resources - this means no APT tokens");
      console.log("The account needs to be funded with real APT from an exchange or wallet");
      console.log(`Send APT to: ${account.accountAddress.toString()}`);
      return;
    }
  } catch (error: any) {
    console.log(`Resources check failed: ${error.message}`);
  }
  
  // Try to build a minimal transaction
  console.log("\n🔨 Building minimal transaction...");
  
  try {
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: "0x1::aptos_account::transfer",
        functionArguments: [account.accountAddress.toString(), "1"], // Send 1 Octa to self
      },
    });
    
    console.log("✅ Transaction built successfully!");
    
    // Show transaction details
    const rawTransaction = (transaction as any).rawTransaction;
    if (rawTransaction) {
      console.log(`Gas cost: ${rawTransaction.max_gas_amount} * ${rawTransaction.gas_unit_price} = ${BigInt(rawTransaction.max_gas_amount) * BigInt(rawTransaction.gas_unit_price)} Octas`);
    }
    
    // Sign and submit
    console.log("✍️ Signing and submitting...");
    const senderAuthenticator = aptos.transaction.sign({ 
      signer: account, 
      transaction 
    });
    
    const committedTxn = await aptos.transaction.submit.simple({
      transaction,
      senderAuthenticator,
    });
    
    console.log("✅ Transaction submitted!");
    console.log(`Hash: ${committedTxn.hash}`);
    
    // Wait for confirmation
    await aptos.waitForTransaction({ transactionHash: committedTxn.hash });
    console.log("✅ Transaction confirmed!");
    
    // Check resources again
    const newResources = await aptos.getAccountResources({ accountAddress: account.accountAddress });
    console.log(`New resources count: ${newResources.length}`);
    
  } catch (error: any) {
    console.error("❌ Transaction failed:", error.message);
    
    if (error.message.includes("INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE")) {
      console.log("\n💡 Solution: The account needs to be funded with real APT");
      console.log(`Send APT to: ${account.accountAddress.toString()}`);
      console.log("You can send APT from:");
      console.log("- An exchange (Coinbase, Binance, etc.)");
      console.log("- Another Aptos wallet");
      console.log("- A faucet (for testnet only)");
    }
  }
}

// Run the script
initializeWithSmallTx().catch(console.error);
