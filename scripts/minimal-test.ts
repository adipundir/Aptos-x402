#!/usr/bin/env tsx

/**
 * Minimal Transaction Test
 * 
 * This script tries the most basic transaction possible.
 */

import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

async function minimalTest() {
  console.log("🔧 Testing minimal transaction...");
  
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
  
  console.log(`Account address: ${account.accountAddress}`);
  
  // Check current balance
  const balance = await aptos.getAccountAPTAmount({ accountAddress: account.accountAddress });
  console.log(`Current balance: ${balance} APT`);
  
  // Try to get account info
  try {
    const accountInfo = await aptos.getAccountInfo({ accountAddress: account.accountAddress });
    console.log(`Account info:`, accountInfo);
  } catch (error: any) {
    console.error("Failed to get account info:", error.message);
  }
  
  // Try to get account resources
  try {
    const resources = await aptos.getAccountResources({ accountAddress: account.accountAddress });
    console.log(`Account resources:`, resources);
  } catch (error: any) {
    console.error("Failed to get account resources:", error.message);
  }
  
  // Try a different approach - check if we can get the balance using resources
  try {
    const resources = await aptos.getAccountResources({ accountAddress: account.accountAddress });
    const coinStore = resources.find(r => r.type.includes("CoinStore"));
    if (coinStore) {
      console.log(`CoinStore resource:`, coinStore);
    } else {
      console.log("No CoinStore resource found");
    }
  } catch (error: any) {
    console.error("Failed to get resources:", error.message);
  }
}

// Run the script
minimalTest().catch(console.error);
