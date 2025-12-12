/**
 * Deploy and Initialize ARC-8004 Contracts
 * 
 * This script:
 * 1. Deploys the ARC-8004 Move package
 * 2. Initializes all three modules (agent_identity, reputation, validation) with the admin account
 * 
 * Usage:
 *   tsx scripts/deploy-arc8004.ts
 */

import { config } from 'dotenv';
import { Aptos, Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Load environment variables from .env file
config();

const NETWORK = process.env.APTOS_NETWORK || 'aptos-testnet';
const ADMIN_PRIVATE_KEY = process.env.ARC8004_ADMIN_PRIVATE_KEY;

if (!ADMIN_PRIVATE_KEY) {
  throw new Error('ARC8004_ADMIN_PRIVATE_KEY environment variable is required');
}

// Remove '0x' prefix if present
const cleanKey = ADMIN_PRIVATE_KEY.replace(/^0x/, '');
const privateKey = new Ed25519PrivateKey(cleanKey);
const adminAccount = Account.fromPrivateKey({ privateKey });

const NODE_URL = NETWORK === 'aptos-testnet' 
  ? process.env.APTOS_TESTNET_NODE_URL || 'https://fullnode.testnet.aptoslabs.com/v1'
  : process.env.APTOS_MAINNET_NODE_URL || 'https://fullnode.mainnet.aptoslabs.com/v1';

const aptos = new Aptos({ network: NETWORK });

async function checkAccountBalance(address: string): Promise<bigint> {
  try {
    const resources = await aptos.getAccountResources({ accountAddress: address });
    const accountResource = resources.find((r: any) => r.type === '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>');
    return accountResource ? BigInt((accountResource.data as any).coin.value) : BigInt(0);
  } catch {
    return BigInt(0);
  }
}

async function deployContract() {
  console.log('\n=== Deploying ARC-8004 Contracts ===');
  console.log(`Network: ${NETWORK}`);
  console.log(`Admin Address: ${adminAccount.accountAddress.toString()}`);
  
  // Check balance
  const balance = await checkAccountBalance(adminAccount.accountAddress.toString());
  console.log(`Admin Balance: ${Number(balance) / 1e8} APT`);
  
  if (balance < BigInt(100000000)) { // Less than 1 APT
    console.warn('⚠️  Warning: Admin account has less than 1 APT. Deployment may fail.');
    console.log('   Fund the account at:', adminAccount.accountAddress.toString());
  }

  const contractDir = path.join(process.cwd(), 'contracts', 'arc8004');
  
  console.log('\n📦 Building Move package...');
  try {
    execSync('aptos move build', { 
      cwd: contractDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        APTOS_NETWORK: NETWORK,
      },
    });
    console.log('✅ Build successful');
  } catch (error) {
    console.error('❌ Build failed:', error);
    throw error;
  }

  console.log('\n🚀 Publishing package...');
  try {
    const publishCommand = `aptos move publish --assume-yes --private-key ${ADMIN_PRIVATE_KEY} --url ${NODE_URL}`;
    execSync(publishCommand, {
      cwd: contractDir,
      stdio: 'inherit',
    });
    console.log('✅ Package published');
  } catch (error) {
    console.error('❌ Publish failed:', error);
    throw error;
  }

  // Get the published module address
  const accountResources = await aptos.getAccountResources({ 
    accountAddress: adminAccount.accountAddress.toString() 
  });
  const moduleAddress = adminAccount.accountAddress.toString();
  
  console.log(`\n📋 Module Address: ${moduleAddress}`);
  console.log('\n💾 Update your .env file:');
  console.log(`ARC8004_MODULE_ADDRESS=${moduleAddress}`);
}

async function initializeModules() {
  console.log('\n=== Initializing ARC-8004 Modules ===');
  
  const moduleAddress = adminAccount.accountAddress.toString();
  
  // Initialize agent_identity
  console.log('\n1️⃣ Initializing agent_identity module...');
  try {
    const transaction = await aptos.transaction.build.simple({
      sender: adminAccount.accountAddress,
      data: {
        function: `${moduleAddress}::agent_identity::initialize`,
        functionArguments: [],
      },
    });

    const committed = await aptos.signAndSubmitTransaction({
      signer: adminAccount,
      transaction,
    });

    await aptos.waitForTransaction({ transactionHash: committed.hash });
    console.log(`✅ agent_identity initialized: ${committed.hash}`);
  } catch (error: any) {
    if (error.message?.includes('ALREADY_PUBLISHED') || error.message?.includes('RESOURCE_ALREADY_EXISTS')) {
      console.log('⚠️  agent_identity already initialized');
    } else {
      console.error('❌ Failed to initialize agent_identity:', error.message);
      throw error;
    }
  }

  // Initialize reputation
  console.log('\n2️⃣ Initializing reputation module...');
  try {
    const transaction = await aptos.transaction.build.simple({
      sender: adminAccount.accountAddress,
      data: {
        function: `${moduleAddress}::reputation::initialize`,
        functionArguments: [],
      },
    });

    const committed = await aptos.signAndSubmitTransaction({
      signer: adminAccount,
      transaction,
    });

    await aptos.waitForTransaction({ transactionHash: committed.hash });
    console.log(`✅ reputation initialized: ${committed.hash}`);
  } catch (error: any) {
    if (error.message?.includes('ALREADY_PUBLISHED') || error.message?.includes('RESOURCE_ALREADY_EXISTS')) {
      console.log('⚠️  reputation already initialized');
    } else {
      console.error('❌ Failed to initialize reputation:', error.message);
      throw error;
    }
  }

  // Initialize validation
  console.log('\n3️⃣ Initializing validation module...');
  try {
    const transaction = await aptos.transaction.build.simple({
      sender: adminAccount.accountAddress,
      data: {
        function: `${moduleAddress}::validation::initialize`,
        functionArguments: [],
      },
    });

    const committed = await aptos.signAndSubmitTransaction({
      signer: adminAccount,
      transaction,
    });

    await aptos.waitForTransaction({ transactionHash: committed.hash });
    console.log(`✅ validation initialized: ${committed.hash}`);
  } catch (error: any) {
    if (error.message?.includes('ALREADY_PUBLISHED') || error.message?.includes('RESOURCE_ALREADY_EXISTS')) {
      console.log('⚠️  validation already initialized');
    } else {
      console.error('❌ Failed to initialize validation:', error.message);
      throw error;
    }
  }
}

async function main() {
  try {
    await deployContract();
    await initializeModules();
    
    console.log('\n✅ ARC-8004 contracts deployed and initialized successfully!');
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Update ARC8004_MODULE_ADDRESS in .env to: ${adminAccount.accountAddress.toString()}`);
    console.log(`   2. The admin account is: ${adminAccount.accountAddress.toString()}`);
    console.log(`   3. Make sure ARC8004_ADMIN_PRIVATE_KEY is set in .env`);
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  }
}

main();

