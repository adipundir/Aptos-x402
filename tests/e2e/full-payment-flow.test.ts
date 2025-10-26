/**
 * Full End-to-End Payment Flow Test
 * 
 * Complete integration test covering the entire x402 payment flow:
 * 1. Initial 402 response
 * 2. Client builds payment
 * 3. Verification
 * 4. Settlement
 * 5. Resource delivery
 * 6. On-chain confirmation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Network } from '@aptos-labs/ts-sdk';
import { createX402Client } from '../../lib/x402-client';
import {
  buildPaymentPayload,
  verifyTransactionOnChain,
  getAccountBalance,
} from '../utils/test-helpers';
import {
  loadDemoAccount,
  loadRecipientAddress,
  ensureDemoAccountFunded,
  validateTestEnvironment,
  hasSufficientBalance,
  getBalance,
} from '../utils/test-accounts';

describe('Full x402 Payment Flow Integration', () => {
  let demoAccount: any;
  let recipientAddress: string;
  let client: any;
  const protectedUrl = 'http://localhost:3000/api/protected/weather';

  beforeAll(async () => {
    // Validate environment
    validateTestEnvironment();
    
    // Load configuration
    recipientAddress = loadRecipientAddress();
    
    // Ensure demo account is funded
    demoAccount = await ensureDemoAccountFunded();
    
    // Initialize client
    client = createX402Client({
      privateKey: demoAccount.privateKey,
      network: Network.TESTNET,
    });
    
    console.log('\n📋 Full Integration Test Configuration:');
    console.log(`  Protected URL: ${protectedUrl}`);
    console.log(`  Client Address: ${demoAccount.address}`);
    console.log(`  Recipient Address: ${recipientAddress}`);
  });

  it('should complete full payment flow from start to finish', async () => {
    console.log('\n🎬 Starting full x402 payment flow...\n');
    
    // Check sufficient balance
    const sufficient = await hasSufficientBalance(
      demoAccount.address,
      '1000000',
      Network.TESTNET
    );
    
    if (!sufficient) {
      console.warn('⚠️  Skipping full flow test - insufficient balance');
      return;
    }
    
    // ==========================================
    // STEP 1: Initial Request (No Payment)
    // ==========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 1: Initial Request (No Payment)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const step1Start = Date.now();
    const initialResponse = await fetch(protectedUrl);
    const step1Duration = Date.now() - step1Start;
    
    expect(initialResponse.status).toBe(402);
    console.log(`✅ Received 402 Payment Required (${step1Duration}ms)`);
    
    const paymentReq = await initialResponse.json();
    expect(paymentReq.x402Version).toBe(1);
    expect(paymentReq.accepts).toHaveLength(1);
    
    const requirements = paymentReq.accepts[0];
    console.log(`Payment Requirements:`);
    console.log(`  Scheme: ${requirements.scheme}`);
    console.log(`  Network: ${requirements.network}`);
    console.log(`  Amount: ${requirements.maxAmountRequired} Octas (${requirements.maxAmountRequired / 100_000_000} APT)`);
    console.log(`  Recipient: ${requirements.payTo}`);
    console.log(`  Description: ${requirements.description}`);
    
    // ==========================================
    // STEP 2: Get Initial Balances
    // ==========================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 2: Record Initial Balances');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const senderBalanceBefore = await getBalance(demoAccount.address, Network.TESTNET);
    const recipientBalanceBefore = await getBalance(recipientAddress, Network.TESTNET);
    
    console.log(`Sender Balance: ${senderBalanceBefore / 100_000_000} APT (${senderBalanceBefore} Octas)`);
    console.log(`Recipient Balance: ${recipientBalanceBefore / 100_000_000} APT (${recipientBalanceBefore} Octas)`);
    
    // ==========================================
    // STEP 3: Client Builds Payment
    // ==========================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 3: Client Builds Payment');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const step3Start = Date.now();
    const paymentHeader = await buildPaymentPayload(
      demoAccount.privateKey,
      requirements,
      Network.TESTNET
    );
    const step3Duration = Date.now() - step3Start;
    
    console.log(`✅ Transaction signed and serialized (${step3Duration}ms)`);
    console.log(`Payment Header Length: ${paymentHeader.length} chars`);
    console.log(`Payment Header Preview: ${paymentHeader.substring(0, 80)}...`);
    
    // ==========================================
    // STEP 4: Request with Payment
    // ==========================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 4: Request with Payment (Verify + Settle)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const step4Start = Date.now();
    const paidResponse = await fetch(protectedUrl, {
      headers: {
        'X-PAYMENT': paymentHeader,
      },
    });
    const step4Duration = Date.now() - step4Start;
    
    expect(paidResponse.status).toBe(200);
    console.log(`✅ Request successful (${step4Duration}ms)`);
    
    // Parse timing headers
    const verifyTime = paidResponse.headers.get('x-verification-time');
    const settleTime = paidResponse.headers.get('x-settlement-time');
    
    console.log(`\nTiming Breakdown:`);
    console.log(`  Verification: ${verifyTime}ms`);
    console.log(`  Settlement: ${settleTime}ms`);
    console.log(`  Total: ${step4Duration}ms`);
    
    // ==========================================
    // STEP 5: Verify Payment Response
    // ==========================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 5: Verify Payment Response');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const paymentResponseHeader = paidResponse.headers.get('x-payment-response');
    expect(paymentResponseHeader).toBeTruthy();
    
    const paymentResponse = JSON.parse(
      Buffer.from(paymentResponseHeader!, 'base64').toString()
    );
    
    expect(paymentResponse.settlement).toBeTruthy();
    expect(paymentResponse.settlement.success).toBe(true);
    expect(paymentResponse.settlement.txHash).toBeTruthy();
    expect(paymentResponse.settlement.networkId).toBe('aptos-testnet');
    
    console.log(`✅ Payment settled successfully`);
    console.log(`Transaction Hash: ${paymentResponse.settlement.txHash}`);
    console.log(`Network: ${paymentResponse.settlement.networkId}`);
    
    // ==========================================
    // STEP 6: Verify Resource Delivered
    // ==========================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 6: Verify Resource Delivered');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const resourceData = await paidResponse.json();
    
    expect(resourceData.location).toBeTruthy();
    expect(resourceData.temperature).toBeTruthy();
    expect(resourceData.conditions).toBeTruthy();
    
    console.log(`✅ Protected resource delivered`);
    console.log(`Resource Data:`);
    console.log(`  Location: ${resourceData.location}`);
    console.log(`  Temperature: ${resourceData.temperature}°F`);
    console.log(`  Conditions: ${resourceData.conditions}`);
    
    // ==========================================
    // STEP 7: Verify On Blockchain
    // ==========================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 7: Verify Transaction On Blockchain');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const txHash = paymentResponse.settlement.txHash;
    console.log(`Verifying TX: ${txHash}`);
    
    const onChain = await verifyTransactionOnChain(txHash, Network.TESTNET);
    expect(onChain).toBe(true);
    
    console.log(`✅ Transaction confirmed on Aptos blockchain`);
    console.log(`Explorer: https://explorer.aptoslabs.com/txn/${txHash}?network=testnet`);
    
    // ==========================================
    // STEP 8: Verify Balance Changes
    // ==========================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 8: Verify Balance Changes');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Wait a moment for balance to update
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const senderBalanceAfter = await getBalance(demoAccount.address, Network.TESTNET);
    const recipientBalanceAfter = await getBalance(recipientAddress, Network.TESTNET);
    
    const senderDiff = senderBalanceBefore - senderBalanceAfter;
    const recipientDiff = recipientBalanceAfter - recipientBalanceBefore;
    
    console.log(`\nBalance Changes:`);
    console.log(`  Sender: ${senderBalanceBefore / 100_000_000} APT → ${senderBalanceAfter / 100_000_000} APT`);
    console.log(`  Sender Paid: ${senderDiff / 100_000_000} APT (${senderDiff} Octas)`);
    console.log(`  Recipient: ${recipientBalanceBefore / 100_000_000} APT → ${recipientBalanceAfter / 100_000_000} APT`);
    console.log(`  Recipient Received: ${recipientDiff / 100_000_000} APT (${recipientDiff} Octas)`);
    
    // Sender should have paid at least the payment amount (plus gas)
    expect(senderDiff).toBeGreaterThanOrEqual(parseInt(requirements.maxAmountRequired));
    
    // Recipient should have received exactly the payment amount
    expect(recipientDiff).toBe(parseInt(requirements.maxAmountRequired));
    
    console.log(`\n✅ Balance changes verified`);
    console.log(`  Payment: ${recipientDiff} Octas`);
    console.log(`  Gas: ~${senderDiff - recipientDiff} Octas`);
    
    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 FULL PAYMENT FLOW COMPLETED SUCCESSFULLY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const totalTime = step1Duration + step3Duration + step4Duration;
    
    console.log(`\nFlow Summary:`);
    console.log(`  ✅ Step 1: Initial 402 (${step1Duration}ms)`);
    console.log(`  ✅ Step 2: Balance check`);
    console.log(`  ✅ Step 3: Sign transaction (${step3Duration}ms)`);
    console.log(`  ✅ Step 4: Verify + Settle (${step4Duration}ms)`);
    console.log(`  ✅ Step 5: Payment response verified`);
    console.log(`  ✅ Step 6: Resource delivered`);
    console.log(`  ✅ Step 7: On-chain confirmation`);
    console.log(`  ✅ Step 8: Balance changes verified`);
    console.log(`\nTotal Time: ${totalTime}ms`);
    console.log(`Transaction: ${txHash}`);
    console.log(`Payment: ${recipientDiff / 100_000_000} APT`);
    console.log(`\n🚀 x402 protocol working perfectly on Aptos!\n`);
    
  }, 30000); // 30 second timeout for full flow

  it('should work with client SDK (automated)', async () => {
    console.log('\n🤖 Testing automated client SDK flow...\n');
    
    // Check sufficient balance
    const sufficient = await hasSufficientBalance(
      demoAccount.address,
      '1000000',
      Network.TESTNET
    );
    
    if (!sufficient) {
      console.warn('⚠️  Skipping SDK flow test - insufficient balance');
      return;
    }
    
    const balanceBefore = await getBalance(demoAccount.address, Network.TESTNET);
    
    // Client SDK handles everything automatically
    const response = await client.get(protectedUrl);
    
    // Verify success
    expect(response.status).toBe(200);
    expect(response.data).toBeTruthy();
    expect(response.paymentDetails).toBeTruthy();
    
    console.log(`✅ Automated flow completed`);
    console.log(`TX Hash: ${response.paymentDetails.transactionHash}`);
    console.log(`Resource: ${response.data.location}, ${response.data.temperature}°F`);
    
    // Verify balance decreased
    const balanceAfter = await getBalance(demoAccount.address, Network.TESTNET);
    const paid = balanceBefore - balanceAfter;
    
    expect(paid).toBeGreaterThan(0);
    console.log(`Paid: ${paid / 100_000_000} APT (including gas)`);
    
    console.log(`\n🚀 Client SDK working perfectly!\n`);
  }, 20000);
});


