#!/usr/bin/env tsx

/**
 * Debug Full x402 Flow
 * 
 * This script shows the entire x402 payment flow with detailed transaction debugging.
 */

import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

async function debugFullFlow() {
  console.log("🔧 Debugging Full x402 Payment Flow");
  console.log("=".repeat(60));
  
  const privateKey = "0x21c31d63f7719d3de90b9c14b264229db65609f11f86413cb81a7ed7fcb18f3f";
  const network = "aptos-mainnet";
  
  // Step 1: Initialize Aptos client
  console.log("\n📡 Step 1: Initializing Aptos Client");
  console.log("-".repeat(40));
  
  const networkMap: Record<string, Network> = {
    'aptos-mainnet': Network.MAINNET,
    'aptos-testnet': Network.TESTNET,
    'aptos-devnet': Network.DEVNET,
  };
  
  const aptosNetwork = networkMap[network] || Network.MAINNET;
  const config = new AptosConfig({ 
    network: aptosNetwork,
    fullnode: "https://fullnode.mainnet.aptoslabs.com/v1"
  });
  const aptos = new Aptos(config);
  
  console.log(`Network: ${network} (${aptosNetwork})`);
  console.log(`RPC URL: https://fullnode.mainnet.aptoslabs.com/v1`);
  
  // Step 2: Create account
  console.log("\n🔑 Step 2: Creating Account");
  console.log("-".repeat(40));
  
  const privateKeyObj = new Ed25519PrivateKey(privateKey);
  const account = Account.fromPrivateKey({ privateKey: privateKeyObj });
  
  console.log(`Private Key: ${privateKey}`);
  console.log(`Account Address: ${account.accountAddress.toString()}`);
  
  // Step 3: Check account state
  console.log("\n💰 Step 3: Checking Account State");
  console.log("-".repeat(40));
  
  try {
    const balance = await aptos.getAccountAPTAmount({ accountAddress: account.accountAddress });
    console.log(`Balance (getAccountAPTAmount): ${balance} APT`);
  } catch (error: any) {
    console.log(`Balance check failed: ${error.message}`);
  }
  
  try {
    const accountInfo = await aptos.getAccountInfo({ accountAddress: account.accountAddress });
    console.log(`Sequence Number: ${accountInfo.sequence_number}`);
    console.log(`Authentication Key: ${accountInfo.authentication_key}`);
  } catch (error: any) {
    console.log(`Account info failed: ${error.message}`);
  }
  
  try {
    const resources = await aptos.getAccountResources({ accountAddress: account.accountAddress });
    console.log(`Resources count: ${resources.length}`);
    
    const coinStore = resources.find(r => r.type.includes("CoinStore"));
    if (coinStore && coinStore.data && (coinStore.data as any).coin) {
      console.log(`CoinStore found: ${(coinStore.data as any).coin.value} Octas`);
    } else {
      console.log("❌ No CoinStore resource found");
    }
  } catch (error: any) {
    console.log(`Resources check failed: ${error.message}`);
  }
  
  // Step 4: Simulate x402-axios transaction building
  console.log("\n🔨 Step 4: Building Transaction (x402-axios style)");
  console.log("-".repeat(40));
  
  const recipient = "0xfab13bbad0d9ed276b08cc5394b7a9e259246221fe67efc6da555757415e1850";
  const amount = "10"; // 10 Octas
  
  console.log(`Recipient: ${recipient}`);
  console.log(`Amount: ${amount} Octas`);
  
  try {
    // Build transaction exactly like x402-axios does
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: "0x1::aptos_account::transfer",
        functionArguments: [recipient, amount],
      },
    });
    
    console.log("✅ Transaction built successfully!");
    
    // Show raw transaction details
    console.log("\n📋 Raw Transaction Details:");
    console.log("-".repeat(30));
    
    const rawTransaction = (transaction as any).rawTransaction;
    if (rawTransaction) {
      console.log(`Sender: ${rawTransaction.sender}`);
      console.log(`Sequence Number: ${rawTransaction.sequence_number}`);
      console.log(`Max Gas Amount: ${rawTransaction.max_gas_amount}`);
      console.log(`Gas Unit Price: ${rawTransaction.gas_unit_price}`);
      console.log(`Expiration: ${new Date(Number(rawTransaction.expiration_timestamp_secs) * 1000).toISOString()}`);
      
      // Calculate costs
      const gasCost = BigInt(rawTransaction.max_gas_amount) * BigInt(rawTransaction.gas_unit_price);
      const totalCost = gasCost + BigInt(amount);
      
      console.log("\n💰 Cost Breakdown:");
      console.log(`  Transfer Amount: ${amount} Octas`);
      console.log(`  Gas Cost: ${gasCost} Octas (${Number(gasCost) / 100000000} APT)`);
      console.log(`  Total Cost: ${totalCost} Octas (${Number(totalCost) / 100000000} APT)`);
      
      // Show transaction bytes
      const transactionBytes = transaction.bcsToBytes();
      console.log(`\n📦 Transaction BCS Bytes: ${transactionBytes.length} bytes`);
      console.log(`First 32 bytes: ${Array.from(transactionBytes.slice(0, 32)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
      
    } else {
      console.log("❌ Raw transaction not found");
    }
    
    // Step 5: Sign transaction
    console.log("\n✍️ Step 5: Signing Transaction");
    console.log("-".repeat(40));
    
    const senderAuthenticator = aptos.transaction.sign({ 
      signer: account, 
      transaction 
    });
    
    console.log("✅ Transaction signed successfully!");
    
    // Show signature details
    const signatureBytes = senderAuthenticator.bcsToBytes();
    console.log(`Signature BCS Bytes: ${signatureBytes.length} bytes`);
    console.log(`First 16 bytes: ${Array.from(signatureBytes.slice(0, 16)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
    
    // Step 6: Create x402 PaymentPayload
    console.log("\n📦 Step 6: Creating x402 PaymentPayload");
    console.log("-".repeat(40));
    
    const transactionHex = Buffer.from(transaction.bcsToBytes()).toString('hex');
    const signatureHex = Buffer.from(signatureBytes).toString('hex');
    
    const paymentPayload = {
      x402Version: 1,
      scheme: "exact",
      network: network,
      payload: {
        transaction: transactionHex,
        signature: signatureHex,
      },
    };
    
    console.log("PaymentPayload structure:");
    console.log(`  x402Version: ${paymentPayload.x402Version}`);
    console.log(`  scheme: ${paymentPayload.scheme}`);
    console.log(`  network: ${paymentPayload.network}`);
    console.log(`  transaction (hex): ${transactionHex.substring(0, 50)}...`);
    console.log(`  signature (hex): ${signatureHex.substring(0, 50)}...`);
    
    // Step 7: Test transaction submission
    console.log("\n🚀 Step 7: Testing Transaction Submission");
    console.log("-".repeat(40));
    
    try {
      console.log("Submitting transaction to blockchain...");
      const committedTxn = await aptos.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });
      
      console.log("✅ Transaction submitted successfully!");
      console.log(`Transaction Hash: ${committedTxn.hash}`);
      
      // Wait for confirmation
      console.log("⏳ Waiting for confirmation...");
      await aptos.waitForTransaction({ transactionHash: committedTxn.hash });
      
      console.log("✅ Transaction confirmed!");
      
    } catch (submitError: any) {
      console.error("❌ Transaction submission failed:");
      console.error(`Error: ${submitError.message}`);
      console.error(`Error Code: ${submitError.error_code || 'N/A'}`);
      console.error(`VM Error Code: ${submitError.vm_error_code || 'N/A'}`);
    }
    
  } catch (error: any) {
    console.error("❌ Transaction building failed:", error.message);
  }
  
  console.log("\n" + "=".repeat(60));
  console.log("🏁 Debug Complete");
}

// Run the script
debugFullFlow().catch(console.error);
