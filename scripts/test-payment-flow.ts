#!/usr/bin/env tsx
/**
 * Test script for x402 payment flow
 * Tests the complete flow: 402 → payment → success
 */

import { x402axios } from '../lib/x402-axios';

// Use the demo private key from .env
const DEMO_PRIVATE_KEY = process.env.DEMO_PRIVATE_KEY || process.env.NEXT_PUBLIC_DEMO_PRIVATE_KEY || '0x21c31d63f7719d3de90b9c14b264229db65609f11f86413cb81a7ed7fcb18f3f';

async function testPaymentFlow() {
  console.log('\n🧪 Testing x402 Payment Flow');
  console.log('=' .repeat(50));
  
  const API_URL = 'http://localhost:3000/api/protected/weather';
  
  try {
    console.log(`\n📍 Target: ${API_URL}`);
    console.log(`🔑 Using private key: ${DEMO_PRIVATE_KEY.slice(0, 20)}...`);
    
    const startTime = Date.now();
    
    // Make request with x402axios - it will handle 402 automatically
    console.log('\n🚀 Making request with x402axios...\n');
    
    const response = await x402axios.get(API_URL, {
      privateKey: DEMO_PRIVATE_KEY,
    });
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log('\n✅ SUCCESS! Request completed');
    console.log('=' .repeat(50));
    console.log(`⏱️  Total time: ${totalTime}ms`);
    console.log(`📊 Status: ${response.status}`);
    
    if (response.paymentInfo) {
      console.log('\n💰 Payment Info:');
      console.log(`  Transaction Hash: ${response.paymentInfo.transactionHash}`);
      console.log(`  Amount: ${response.paymentInfo.amount}`);
      console.log(`  Recipient: ${response.paymentInfo.recipient}`);
      console.log(`  Network: ${response.paymentInfo.network}`);
      console.log(`  Payer: ${response.paymentInfo.payer}`);
    }
    
    console.log('\n📦 Response Data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Check headers for timing info
    const verificationTime = response.headers['verification-time'];
    const settlementTime = response.headers['settlement-time'];
    
    if (verificationTime || settlementTime) {
      console.log('\n⏱️  Performance Breakdown:');
      if (verificationTime) console.log(`  Verification: ${verificationTime}ms`);
      if (settlementTime) console.log(`  Settlement: ${settlementTime}ms`);
    }
    
    console.log('\n✅ All tests passed!');
    process.exit(0);
    
  } catch (error: any) {
    console.error('\n❌ ERROR during payment flow');
    console.error('=' .repeat(50));
    
    if (error.message) {
      console.error(`Message: ${error.message}`);
    }
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    }
    
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// Check if server is likely running
async function checkServerHealth() {
  try {
    const response = await fetch('http://localhost:3000');
    if (response.ok || response.status === 404) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Main execution
(async () => {
  console.log('🔍 Checking if server is running...');
  const isServerRunning = await checkServerHealth();
  
  if (!isServerRunning) {
    console.error('\n❌ Server is not running on http://localhost:3000');
    console.error('Please start the server first with: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Server is running\n');
  
  await testPaymentFlow();
})();
