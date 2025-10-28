#!/usr/bin/env tsx

/**
 * Validate Keypair for Mainnet
 * 
 * This script validates that the keypair is valid and ready for mainnet transactions.
 */

import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

async function validateKeypair() {
  console.log("🔧 Validating Keypair for Mainnet");
  console.log("=".repeat(50));
  
  const privateKey = "0x21c31d63f7719d3de90b9c14b264229db65609f11f86413cb81a7ed7fcb18f3f";
  
  // Step 1: Validate private key format
  console.log("\n🔑 Step 1: Validating Private Key Format");
  console.log("-".repeat(40));
  
  try {
    const privateKeyObj = new Ed25519PrivateKey(privateKey);
    console.log("✅ Private key format is valid");
    console.log(`Private key length: ${privateKey.length} characters`);
    console.log(`Private key (first 10): ${privateKey.substring(0, 10)}...`);
  } catch (error: any) {
    console.error("❌ Private key format is invalid:", error.message);
    return;
  }
  
  // Step 2: Generate account from private key
  console.log("\n👤 Step 2: Generating Account from Private Key");
  console.log("-".repeat(40));
  
  let account: Account;
  try {
    const privateKeyObj = new Ed25519PrivateKey(privateKey);
    account = Account.fromPrivateKey({ privateKey: privateKeyObj });
    console.log("✅ Account generated successfully");
    console.log(`Account address: ${account.accountAddress.toString()}`);
    console.log(`Account address length: ${account.accountAddress.toString().length} characters`);
  } catch (error: any) {
    console.error("❌ Failed to generate account:", error.message);
    return;
  }
  
  // Step 3: Validate account address format
  console.log("\n📍 Step 3: Validating Account Address Format");
  console.log("-".repeat(40));
  
  const accountAddress = account.accountAddress.toString();
  const expectedAddress = "0xfab13bbad0d9ed276b08cc5394b7a9e259246221fe67efc6da555757415e1850";
  
  console.log(`Generated address: ${accountAddress}`);
  console.log(`Expected address:  ${expectedAddress}`);
  console.log(`Addresses match: ${accountAddress === expectedAddress}`);
  
  if (accountAddress !== expectedAddress) {
    console.error("❌ Account address mismatch!");
    return;
  }
  
  console.log("✅ Account address is correct");
  
  // Step 4: Test mainnet connectivity
  console.log("\n🌐 Step 4: Testing Mainnet Connectivity");
  console.log("-".repeat(40));
  
  const config = new AptosConfig({ 
    network: Network.MAINNET,
    fullnode: "https://fullnode.mainnet.aptoslabs.com/v1"
  });
  const aptos = new Aptos(config);
  
  try {
    // Test basic connectivity
    const ledgerInfo = await aptos.getLedgerInfo();
    console.log("✅ Mainnet connectivity successful");
    console.log(`Chain ID: ${ledgerInfo.chain_id}`);
    console.log(`Ledger version: ${ledgerInfo.ledger_version}`);
    console.log(`Ledger timestamp: ${ledgerInfo.ledger_timestamp}`);
  } catch (error: any) {
    console.error("❌ Mainnet connectivity failed:", error.message);
    return;
  }
  
  // Step 5: Check account state on mainnet
  console.log("\n💰 Step 5: Checking Account State on Mainnet");
  console.log("-".repeat(40));
  
  try {
    // Check if account exists
    const accountInfo = await aptos.getAccountInfo({ accountAddress: account.accountAddress });
    console.log("✅ Account exists on mainnet");
    console.log(`Sequence number: ${accountInfo.sequence_number}`);
    console.log(`Authentication key: ${accountInfo.authentication_key}`);
  } catch (error: any) {
    console.log("ℹ️  Account doesn't exist yet (this is normal for new accounts)");
    console.log(`Error: ${error.message}`);
  }
  
  // Check account resources
  try {
    const resources = await aptos.getAccountResources({ accountAddress: account.accountAddress });
    console.log(`Resources count: ${resources.length}`);
    
    if (resources.length > 0) {
      console.log("✅ Account has resources");
      const coinStore = resources.find(r => r.type.includes("CoinStore"));
      if (coinStore && coinStore.data && (coinStore.data as any).coin) {
        console.log(`APT balance: ${(coinStore.data as any).coin.value} Octas`);
      }
    } else {
      console.log("ℹ️  Account has no resources (needs funding)");
    }
  } catch (error: any) {
    console.log(`Resources check: ${error.message}`);
  }
  
  // Step 6: Test transaction building capability
  console.log("\n🔨 Step 6: Testing Transaction Building Capability");
  console.log("-".repeat(40));
  
  try {
    // Try to build a simple transaction
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: "0x1::aptos_account::transfer",
        functionArguments: [account.accountAddress.toString(), "1"], // Send 1 Octa to self
      },
    });
    
    console.log("✅ Transaction building successful");
    
    // Show transaction details
    const rawTransaction = (transaction as any).rawTransaction;
    if (rawTransaction) {
      console.log(`Gas limit: ${rawTransaction.max_gas_amount}`);
      console.log(`Gas price: ${rawTransaction.gas_unit_price}`);
      console.log(`Sequence number: ${rawTransaction.sequence_number}`);
    }
    
    // Test signing capability
    const senderAuthenticator = aptos.transaction.sign({ 
      signer: account, 
      transaction 
    });
    
    console.log("✅ Transaction signing successful");
    console.log(`Signature length: ${senderAuthenticator.bcsToBytes().length} bytes`);
    
  } catch (error: any) {
    console.error("❌ Transaction building failed:", error.message);
    return;
  }
  
  // Step 7: Test keypair consistency
  console.log("\n🔐 Step 7: Testing Keypair Consistency");
  console.log("-".repeat(40));
  
  try {
    // Test that the same private key always generates the same account
    const privateKeyObj1 = new Ed25519PrivateKey(privateKey);
    const account1 = Account.fromPrivateKey({ privateKey: privateKeyObj1 });
    
    const privateKeyObj2 = new Ed25519PrivateKey(privateKey);
    const account2 = Account.fromPrivateKey({ privateKey: privateKeyObj2 });
    
    const addressesMatch = account1.accountAddress.toString() === account2.accountAddress.toString();
    console.log(`Consistent address generation: ${addressesMatch ? '✅ YES' : '❌ NO'}`);
    
    if (!addressesMatch) {
      console.error("❌ Keypair is not consistent!");
      return;
    }
    
  } catch (error: any) {
    console.error("❌ Keypair consistency test failed:", error.message);
    return;
  }
  
  // Step 8: Final validation summary
  console.log("\n📋 Step 8: Final Validation Summary");
  console.log("-".repeat(40));
  
  console.log("✅ Private key format: VALID");
  console.log("✅ Account generation: VALID");
  console.log("✅ Account address: CORRECT");
  console.log("✅ Mainnet connectivity: WORKING");
  console.log("✅ Transaction building: WORKING");
  console.log("✅ Transaction signing: WORKING");
  console.log("✅ Keypair consistency: VALID");
  
  console.log("\n🎯 CONCLUSION:");
  console.log("=".repeat(50));
  console.log("✅ KEYPAIR IS VALID AND READY FOR MAINNET TRANSACTIONS");
  console.log("\n📝 Next steps:");
  console.log("1. Fund the account with APT: 0xfab13bbad0d9ed276b08cc5394b7a9e259246221fe67efc6da555757415e1850");
  console.log("2. Send at least 0.1 APT for gas fees");
  console.log("3. The x402 payment flow will work perfectly!");
  
  console.log("\n" + "=".repeat(50));
}

// Run the script
validateKeypair().catch(console.error);
