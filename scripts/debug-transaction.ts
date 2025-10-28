#!/usr/bin/env tsx

/**
 * Debug Transaction Construction
 * 
 * This script debugs the transaction construction to see why it's failing.
 */

import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

async function debugTransaction() {
  console.log("🔧 Debugging transaction construction...");
  
  const privateKey = "0x21c31d63f7719d3de90b9c14b264229db65609f11f86413cb81a7ed7fcb18f3f";
  const network = "aptos-mainnet";
  
  // Initialize Aptos client
  const config = new AptosConfig({ network: Network.MAINNET });
  const aptos = new Aptos(config);
  
  // Create account from private key
  const privateKeyObj = new Ed25519PrivateKey(privateKey);
  const account = Account.fromPrivateKey({ privateKey: privateKeyObj });
  
  console.log(`Account address: ${account.accountAddress}`);
  
  // Check current balance
  const balance = await aptos.getAccountAPTAmount({ accountAddress: account.accountAddress });
  console.log(`Current balance: ${balance} APT (${balance * 100000000} Octas)`);
  
  // Check account info
  const accountInfo = await aptos.getAccountInfo({ accountAddress: account.accountAddress });
  console.log(`Sequence number: ${accountInfo.sequence_number}`);
  
  // Try to build the same transaction as x402-axios
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
    console.log(`Transaction type: ${transaction.constructor.name}`);
    
    // Check transaction details
    console.log(`\n📋 Transaction details:`);
    console.log(`  Transaction object keys:`, Object.keys(transaction));
    
    // Try to access properties safely
    const rawTransaction = (transaction as any).rawTransaction;
    if (rawTransaction) {
      console.log(`  Sender: ${rawTransaction.sender}`);
      console.log(`  Sequence number: ${rawTransaction.sequence_number}`);
      console.log(`  Max gas amount: ${rawTransaction.max_gas_amount}`);
      console.log(`  Gas unit price: ${rawTransaction.gas_unit_price}`);
      console.log(`  Expiration timestamp: ${rawTransaction.expiration_timestamp_secs}`);
      
      // Calculate total cost
      const totalCost = BigInt(rawTransaction.max_gas_amount) * BigInt(rawTransaction.gas_unit_price) + BigInt(amount);
      console.log(`\n💰 Cost breakdown:`);
      console.log(`  Transfer amount: ${amount} Octas`);
      console.log(`  Gas cost: ${rawTransaction.max_gas_amount} * ${rawTransaction.gas_unit_price} = ${BigInt(rawTransaction.max_gas_amount) * BigInt(rawTransaction.gas_unit_price)} Octas`);
      console.log(`  Total cost: ${totalCost} Octas`);
      console.log(`  Available balance: ${balance * 100000000} Octas`);
      console.log(`  Sufficient funds: ${totalCost <= BigInt(balance * 100000000) ? '✅ YES' : '❌ NO'}`);
    } else {
      console.log("  Raw transaction not found in transaction object");
    }
    
    // Try to simulate the transaction
    console.log(`\n🧪 Simulating transaction...`);
    try {
      // First build the transaction
      const transaction = await aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: "0x1::aptos_account::transfer",
          functionArguments: [recipient, amount],
        },
      });
      
      // Then simulate it
      const simulation = await aptos.transaction.simulate.simple({
        transaction: transaction,
      });
      
      console.log("✅ Simulation successful!");
      console.log(`Simulation result:`, simulation);
      
    } catch (simError: any) {
      console.error("❌ Simulation failed:", simError.message);
    }
    
  } catch (error: any) {
    console.error("❌ Failed to build transaction:", error.message);
    console.error("Full error:", error);
  }
}

// Run the script
debugTransaction().catch(console.error);
