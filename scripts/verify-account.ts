#!/usr/bin/env tsx

/**
 * Verify Account Address
 * 
 * This script verifies the account address and checks if it has funds.
 */

import { Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

async function verifyAccount() {
  console.log("🔧 Verifying account address...");
  
  const privateKey = "0x21c31d63f7719d3de90b9c14b264229db65609f11f86413cb81a7ed7fcb18f3f";
  
  // Create account from private key
  const privateKeyObj = new Ed25519PrivateKey(privateKey);
  const account = Account.fromPrivateKey({ privateKey: privateKeyObj });
  
  console.log(`Private key: ${privateKey}`);
  console.log(`Account address: ${account.accountAddress}`);
  console.log(`Expected address: 0xfab13bbad0d9ed276b08cc5394b7a9e259246221fe67efc6da555757415e1850`);
  console.log(`Addresses match: ${account.accountAddress.toString() === "0xfab13bbad0d9ed276b08cc5394b7a9e259246221fe67efc6da555757415e1850"}`);
  
  // Check if the account address is correct
  if (account.accountAddress.toString() !== "0xfab13bbad0d9ed276b08cc5394b7a9e259246221fe67efc6da555757415e1850") {
    console.log("❌ Account address mismatch! Please check the private key.");
    return;
  }
  
  console.log("✅ Account address is correct!");
  
  // Check balance using different methods
  console.log("\n🔍 Checking balance using different methods...");
  
  // Method 1: Direct API call
  try {
    const response = await fetch("https://fullnode.mainnet.aptoslabs.com/v1/accounts/0xfab13bbad0d9ed276b08cc5394b7a9e259246221fe67efc6da555757415e1850/resources");
    const resources = await response.json();
    console.log("Method 1 - Resources:", resources);
    
    const coinStore = resources.find((r: any) => r.type.includes("CoinStore"));
    if (coinStore) {
      console.log("✅ Found CoinStore resource:", coinStore.data.coin.value);
    } else {
      console.log("❌ No CoinStore resource found");
    }
  } catch (error) {
    console.error("Method 1 failed:", error);
  }
  
  // Method 2: Account info
  try {
    const response = await fetch("https://fullnode.mainnet.aptoslabs.com/v1/accounts/0xfab13bbad0d9ed276b08cc5394b7a9e259246221fe67efc6da555757415e1850");
    const accountInfo = await response.json();
    console.log("Method 2 - Account info:", accountInfo);
  } catch (error) {
    console.error("Method 2 failed:", error);
  }
  
  // Method 3: Transactions
  try {
    const response = await fetch("https://fullnode.mainnet.aptoslabs.com/v1/accounts/0xfab13bbad0d9ed276b08cc5394b7a9e259246221fe67efc6da555757415e1850/transactions");
    const transactions = await response.json();
    console.log("Method 3 - Transactions:", transactions);
    console.log(`Transaction count: ${transactions.length}`);
  } catch (error) {
    console.error("Method 3 failed:", error);
  }
}

// Run the script
verifyAccount().catch(console.error);
