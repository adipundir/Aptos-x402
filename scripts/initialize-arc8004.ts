/**
 * Initialize ARC-8004 Contracts with Admin Account
 * 
 * This script initializes all three ARC-8004 modules (agent_identity, reputation, validation)
 * with the admin account specified in ARC8004_ADMIN_PRIVATE_KEY.
 * 
 * Note: This only works if the contracts are already deployed. If you need to deploy,
 * use the deploy-arc8004.ts script instead.
 * 
 * Usage:
 *   tsx scripts/initialize-arc8004.ts
 */

import { config } from 'dotenv';
import { Aptos, Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';

// Load environment variables from .env file
config();

const NETWORK_ENV = process.env.APTOS_NETWORK || 'aptos-testnet';
const ADMIN_PRIVATE_KEY = process.env.ARC8004_ADMIN_PRIVATE_KEY;
const MODULE_ADDRESS = process.env.ARC8004_MODULE_ADDRESS;

if (!ADMIN_PRIVATE_KEY) {
  throw new Error('ARC8004_ADMIN_PRIVATE_KEY environment variable is required');
}

if (!MODULE_ADDRESS) {
  throw new Error('ARC8004_MODULE_ADDRESS environment variable is required');
}

// Remove '0x' prefix if present
const cleanKey = ADMIN_PRIVATE_KEY.replace(/^0x/, '');
const privateKey = new Ed25519PrivateKey(cleanKey);
const adminAccount = Account.fromPrivateKey({ privateKey });

// Map network to Aptos SDK Network enum
let aptosNetwork: 'testnet' | 'mainnet' | 'devnet';
if (NETWORK_ENV.includes('testnet')) {
  aptosNetwork = 'testnet';
} else if (NETWORK_ENV.includes('mainnet')) {
  aptosNetwork = 'mainnet';
} else {
  aptosNetwork = 'devnet';
}

const aptos = new Aptos({ network: aptosNetwork });

async function initializeModule(moduleName: string, functionName: string) {
  console.log(`\n🔧 Initializing ${moduleName} module...`);
  
  try {
    const transaction = await aptos.transaction.build.simple({
      sender: adminAccount.accountAddress,
      data: {
        function: `${MODULE_ADDRESS}::${functionName}::initialize`,
        functionArguments: [],
      },
    });

    const committed = await aptos.signAndSubmitTransaction({
      signer: adminAccount,
      transaction,
    });

    await aptos.waitForTransaction({ transactionHash: committed.hash });
    console.log(`✅ ${moduleName} initialized successfully`);
    console.log(`   Transaction: ${committed.hash}`);
    return true;
  } catch (error: any) {
    const errorMsg = error.message || error.toString();
    
    if (errorMsg.includes('RESOURCE_ALREADY_EXISTS') || 
        errorMsg.includes('ALREADY_PUBLISHED') ||
        errorMsg.includes('EALREADY_EXISTS')) {
      console.log(`⚠️  ${moduleName} already initialized (this is OK)`);
      return true;
    } else if (errorMsg.includes('MODULE_DOES_NOT_EXIST') || 
               errorMsg.includes('INVALID_MODULE')) {
      console.error(`❌ ${moduleName} module not found at ${MODULE_ADDRESS}`);
      console.error(`   Make sure the contracts are deployed first using deploy-arc8004.ts`);
      return false;
    } else {
      console.error(`❌ Failed to initialize ${moduleName}:`, errorMsg);
      throw error;
    }
  }
}

async function main() {
  console.log('=== Initializing ARC-8004 Modules ===');
  console.log(`Network: ${NETWORK_ENV}`);
  console.log(`Module Address: ${MODULE_ADDRESS}`);
  console.log(`Admin Address: ${adminAccount.accountAddress.toString()}`);
  
  // Check if admin address matches module address
  if (MODULE_ADDRESS.toLowerCase() !== adminAccount.accountAddress.toString().toLowerCase()) {
    console.log('\n⚠️  Warning: Module address does not match admin address.');
    console.log('   The admin will be set to:', adminAccount.accountAddress.toString());
    console.log('   Make sure this is intentional.\n');
  }

  try {
    const results = await Promise.allSettled([
      initializeModule('agent_identity', 'agent_identity'),
      initializeModule('reputation', 'reputation'),
      initializeModule('validation', 'validation'),
    ]);

    const allSuccess = results.every(r => r.status === 'fulfilled' && r.value === true);
    
    if (allSuccess) {
      console.log('\n✅ All modules initialized successfully!');
      console.log(`\n📝 Admin account configured: ${adminAccount.accountAddress.toString()}`);
      console.log('   You can now use this account to verify agent identities on-chain.');
    } else {
      console.log('\n⚠️  Some modules may not have initialized. Check the errors above.');
    }
  } catch (error) {
    console.error('\n❌ Initialization failed:', error);
    process.exit(1);
  }
}

main();

