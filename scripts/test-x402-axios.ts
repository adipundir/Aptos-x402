/**
 * Test x402-axios wrapper with Protected API
 * 
 * Usage: npx tsx scripts/test-x402-axios.ts
 */

import { x402axios } from '../lib/x402-axios';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

async function main() {
  console.log('\n┌─────────────────────────────────────────────────┐');
  console.log('│  x402-axios Demo: Automatic Payment Handling    │');
  console.log('└─────────────────────────────────────────────────┘\n');
  
  console.log('This demo will:');
  console.log('  1. Make a request to a protected API endpoint');
  console.log('  2. Automatically handle the 402 payment (gasless!)');
  console.log('  3. Show the response and payment details\n');

  const privateKey = await question('Enter your Aptos private key (0x...): ');
  
  if (!privateKey || !privateKey.startsWith('0x')) {
    console.error('\n❌ Invalid private key format. Must start with 0x');
    rl.close();
    return;
  }

  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Making request to protected API endpoint...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const startTime = Date.now();

    const response = await x402axios.get('http://localhost:3000/api/protected/weather', {
      privateKey: privateKey.trim()
    });
    
    const totalTime = Date.now() - startTime;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Request completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 Response Details:');
    console.log('────────────────────');
    console.log(`Status: ${response.status} OK`);
    console.log(`Total Time: ${totalTime}ms`);
    
    if (response.headers['verification-time']) {
      console.log(`  ↳ Verification: ${response.headers['verification-time']}ms`);
    }
    if (response.headers['settlement-time']) {
      console.log(`  ↳ Settlement: ${response.headers['settlement-time']}ms`);
    }
    
    console.log('\n🌤️  Weather Data:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.paymentInfo) {
      const p = response.paymentInfo;
      console.log('\n💰 Payment Details:');
      console.log('────────────────────');
      console.log(`Transaction: ${p.transactionHash}`);
      console.log(`Amount: ${p.amount}`);
      console.log(`Recipient: ${p.recipient}`);
      console.log(`Network: ${p.network}`);
      console.log(`Payer: ${p.payer}`);
      
      const explorerNetwork = p.network === 'aptos:1' ? 'mainnet' : 'testnet';
      console.log(`\n🔗 https://explorer.aptoslabs.com/txn/${p.transactionHash}?network=${explorerNetwork}`);
    }

    console.log('\n✨ Demo completed!\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Make sure:');
    console.error('  - Server is running: npm run dev');
    console.error('  - GEOMI_API_KEY is set in .env');
    console.error('  - You have USDC for the payment\n');
  } finally {
    rl.close();
  }
}

main().catch(console.error);
