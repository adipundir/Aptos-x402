#!/usr/bin/env tsx

/**
 * Test Transaction Submission
 * 
 * This script tests submitting the same transaction that x402-axios creates.
 */

import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

async function testSubmit() {
  console.log("🔧 Testing transaction submission...");
  
  const privateKey = "0x21c31d63f7719d3de90b9c14b264229db65609f11f86413cb81a7ed7fcb18f3f";
  
  // Initialize Aptos client with the same RPC URL as facilitator
  const config = new AptosConfig({ 
    network: Network.MAINNET,
    fullnode: "https://fullnode.mainnet.aptoslabs.com/v1"
  });
  const aptos = new Aptos(config);
  
  // Create account from private key
  const privateKeyObj = new Ed25519PrivateKey(privateKey);
  const account = Account.fromPrivateKey({ privateKey: privateKeyObj });
  
  console.log(`Account address: ${account.accountAddress}`);
  
  // Check current balance
  const balance = await aptos.getAccountAPTAmount({ accountAddress: account.accountAddress });
  console.log(`Current balance: ${balance} APT`);
  
  // Build the same transaction as x402-axios
  const recipient = "0xfab13bbad0d9ed276b08cc5394b7a9e259246221fe67efc6da555757415e1850";
  const amount = "10"; // 10 Octas
  
  console.log(`\n🔍 Building transaction:`);
  console.log(`  From: ${account.accountAddress}`);
  console.log(`  To: ${recipient}`);
  console.log(`  Amount: ${amount} Octas`);
  
  try {
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: "0x1::aptos_account::transfer",
        functionArguments: [recipient, amount],
      },
    });
    
    console.log("✅ Transaction built successfully!");
    
    // Sign the transaction
    console.log("🔐 Signing transaction...");
    const senderAuthenticator = aptos.transaction.sign({ 
      signer: account, 
      transaction 
    });
    
    console.log("✅ Transaction signed successfully!");
    
    // Submit the transaction
    console.log("📤 Submitting transaction...");
    const committedTxn = await aptos.transaction.submit.simple({
      transaction,
      senderAuthenticator,
    });
    
    console.log("✅ Transaction submitted successfully!");
    console.log(`Transaction hash: ${committedTxn.hash}`);
    
    // Wait for confirmation
    console.log("⏳ Waiting for confirmation...");
    await aptos.waitForTransaction({ transactionHash: committedTxn.hash });
    
    console.log("✅ Transaction confirmed!");
    
    // Check new balance
    const newBalance = await aptos.getAccountAPTAmount({ accountAddress: account.accountAddress });
    console.log(`New balance: ${newBalance} APT`);
    
  } catch (error: any) {
    console.error("❌ Transaction failed:", error.message);
    console.error("Full error:", error);
  }
}

// Run the script
testSubmit().catch(console.error);
