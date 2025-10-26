/**
 * Interactive Demo: Test x402-axios wrapper with Protected API
 * 
 * This script demonstrates how to use the x402-axios package
 * to automatically handle payments when accessing protected APIs.
 * 
 * Usage:
 *   npx tsx scripts/test-x402-axios.ts
 */

import { x402axios } from '../lib/x402-axios';
import { getAccountBalance, getAptosClient, getAccountFromPrivateKey } from '../lib/aptos-utils';
import * as readline from 'readline';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('\n┌─────────────────────────────────────────────────┐');
  console.log('│  x402-axios Demo: Automatic Payment Handling   │');
  console.log('└─────────────────────────────────────────────────┘\n');
  
  console.log('This demo will:');
  console.log('  1. Create an x402-enabled axios instance');
  console.log('  2. Check your account balance');
  console.log('  3. Make a request to a protected API endpoint');
  console.log('  4. Automatically handle the 402 payment');
  console.log('  5. Show the response and payment details\n');

  // Get private key from user
  const privateKey = await question('Enter your Aptos private key (0x...): ');
  
  if (!privateKey || !privateKey.startsWith('0x')) {
    console.error('\n❌ Invalid private key format. Must start with 0x');
    rl.close();
    return;
  }

  console.log('\n🔧 Setting up x402-axios client...\n');

  try {
    console.log('✅ Ready to use x402axios!\n');

    // Check account balance
    console.log('💰 Checking account balance...');
    const aptos = getAptosClient('testnet');
    const account = getAccountFromPrivateKey(privateKey.trim());
    const balance = await getAccountBalance(aptos, account.accountAddress.toString());

    console.log(`   Balance: ${balance} Octas\n`);

    const balanceAPT = parseInt(balance) / 100000000;
    if (balanceAPT < 0.01) {
      console.warn('⚠️  WARNING: Low balance! You may not have enough APT to make payments.');
      console.warn('   Required: ~0.01 APT for this demo\n');
      
      const proceed = await question('Do you want to proceed anyway? (y/n): ');
      if (proceed.toLowerCase() !== 'y') {
        console.log('\n❌ Demo cancelled. Please fund your account and try again.');
        rl.close();
        return;
      }
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Making request to protected API endpoint...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const startTime = Date.now();

    // Make request - payment is handled automatically!
    const response = await x402axios({
      privateKey: privateKey.trim(),
      url: 'http://localhost:3000/api/protected/weather'
    });
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Request completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Display response details
    console.log('📋 Response Details:');
    console.log('────────────────────');
    console.log(`Status: ${response.status} OK`);
    console.log(`Total Time: ${totalTime}ms`);
    
    if (response.headers['x-verification-time']) {
      console.log(`  ↳ Verification: ${response.headers['x-verification-time']}ms`);
    }
    if (response.headers['x-settlement-time']) {
      console.log(`  ↳ Settlement: ${response.headers['x-settlement-time']}ms`);
    }
    
    console.log('\n🌤️  Weather Data:');
    console.log('────────────────────');
    console.log(JSON.stringify(response.data, null, 2));

    // Check if payment was made
    if (response.paymentInfo) {
      const paymentInfo = response.paymentInfo;
      
      console.log('\n💰 Payment Details:');
      console.log('────────────────────');
      console.log(`Transaction Hash: ${paymentInfo.transactionHash}`);
      console.log(`Amount Paid: ${paymentInfo.amount} Octas`);
      console.log(`Recipient: ${paymentInfo.recipient}`);
      console.log(`Settled: ${paymentInfo.settled ? '✓' : '✗'}`);
      console.log(`\n🔗 View on Explorer:`);
      console.log(`   https://explorer.aptoslabs.com/txn/${paymentInfo.transactionHash}?network=testnet`);
    } else {
      // Check X-Payment-Response header
      const paymentResponseHeader = response.headers['x-payment-response'];
      if (paymentResponseHeader) {
        try {
          const decoded = JSON.parse(
            Buffer.from(paymentResponseHeader, 'base64').toString('utf-8')
          );
          
          if (decoded.settlement?.txHash) {
            console.log('\n💰 Payment Details (from header):');
            console.log('────────────────────────────────────');
            console.log(`Transaction Hash: ${decoded.settlement.txHash}`);
            console.log(`Network: ${decoded.settlement.networkId}`);
            console.log(`\n🔗 View on Explorer:`);
            console.log(`   https://explorer.aptoslabs.com/txn/${decoded.settlement.txHash}?network=testnet`);
          }
        } catch (error) {
          console.log('\n⚠️  Could not parse payment response header');
        }
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ Demo completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📝 What happened:');
    console.log('  1. ✓ Made GET request to /api/protected/weather');
    console.log('  2. ✓ Received 402 Payment Required response');
    console.log('  3. ✓ Automatically built & signed payment transaction');
    console.log('  4. ✓ Retried request with X-PAYMENT header');
    console.log('  5. ✓ Payment verified by facilitator');
    console.log('  6. ✓ Payment settled on Aptos blockchain');
    console.log('  7. ✓ Received protected resource (weather data)');
    console.log('\n💡 All of this happened automatically with x402-axios!\n');

  } catch (error: any) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Error occurred during demo');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Status: ${error.response.status}`);
      console.error(`Error:`, error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server');
      console.error('Make sure the server is running: npm run dev');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error:', error.message);
    }
    
    console.error('\n💡 Troubleshooting tips:');
    console.error('  - Make sure the server is running: npm run dev');
    console.error('  - Check that your private key is valid');
    console.error('  - Ensure you have sufficient balance');
    console.error('  - Verify the facilitator is configured correctly\n');
  } finally {
    rl.close();
  }
}

// Run the demo
main().catch(console.error);

