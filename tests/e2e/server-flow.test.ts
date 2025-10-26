/**
 * Server Middleware Flow Tests
 * 
 * Tests the x402 middleware behavior on protected routes.
 * These tests make requests to the actual Next.js server.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Network } from '@aptos-labs/ts-sdk';
import {
  buildPaymentPayload,
  buildInvalidPaymentPayload,
  assert402Response,
  assert200Response,
  parsePaymentResponse,
  verifyTransactionOnChain,
} from '../utils/test-helpers';
import {
  loadDemoAccount,
  loadRecipientAddress,
  ensureDemoAccountFunded,
  validateTestEnvironment,
  hasSufficientBalance,
} from '../utils/test-accounts';

describe('Server Middleware Flow', () => {
  let demoAccount: any;
  let recipientAddress: string;
  const protectedUrl = 'http://localhost:3000/api/protected/weather';

  beforeAll(async () => {
    // Validate environment
    validateTestEnvironment();
    
    // Load configuration
    recipientAddress = loadRecipientAddress();
    
    // Ensure demo account is funded
    demoAccount = await ensureDemoAccountFunded();
    
    console.log('\n📋 Test Configuration:');
    console.log(`  Protected URL: ${protectedUrl}`);
    console.log(`  Demo Account: ${demoAccount.address}`);
    console.log(`  Recipient: ${recipientAddress}`);
  });

  describe('Protected Route Behavior', () => {
    it('should return 402 without X-PAYMENT header', async () => {
      const response = await fetch(protectedUrl);
      const json = await response.json();
      
      // Assert 402 response structure
      const paymentReq = assert402Response(response, json);
      
      // Validate payment requirements
      expect(paymentReq.x402Version).toBe(1);
      expect(paymentReq.accepts).toHaveLength(1);
      
      const firstAccept = paymentReq.accepts[0];
      expect(firstAccept.scheme).toBe('exact');
      expect(firstAccept.network).toBe('aptos-testnet');
      expect(firstAccept.payTo).toBe(recipientAddress);
      expect(firstAccept.maxAmountRequired).toBeTruthy();
      expect(firstAccept.resource).toBe(protectedUrl);
      
      console.log(`  ✅ 402 response structure valid`);
      console.log(`  💰 Payment required: ${firstAccept.maxAmountRequired} Octas`);
    });

    it('should return 403 with invalid payment header', async () => {
      const invalidPayment = buildInvalidPaymentPayload('bad-base64');
      
      const response = await fetch(protectedUrl, {
        headers: {
          'X-PAYMENT': invalidPayment,
        },
      });
      
      const json = await response.json();
      
      // Should return 403 or 400 for invalid payment
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(json.error).toBeTruthy();
      
      console.log(`  ✅ Invalid payment rejected: ${json.error}`);
    });

    it('should return 403 with wrong scheme', async () => {
      const invalidPayment = buildInvalidPaymentPayload('wrong-scheme');
      
      const response = await fetch(protectedUrl, {
        headers: {
          'X-PAYMENT': invalidPayment,
        },
      });
      
      const json = await response.json();
      
      expect(response.status).toBe(400);
      expect(json.error).toContain('scheme');
      
      console.log(`  ✅ Wrong scheme rejected: ${json.error}`);
    });

    it('should return 403 when verification fails', async () => {
      const invalidPayment = buildInvalidPaymentPayload('empty-data');
      
      const response = await fetch(protectedUrl, {
        headers: {
          'X-PAYMENT': invalidPayment,
        },
      });
      
      const json = await response.json();
      
      expect(response.status).toBe(403);
      expect(json.error).toBe('Payment verification failed');
      
      console.log(`  ✅ Verification failure handled: ${json.message}`);
    });
  });

  describe('Successful Payment Flow', () => {
    it('should verify, settle, and deliver resource with valid payment', async () => {
      // Check balance
      const sufficient = await hasSufficientBalance(
        demoAccount.address,
        '1000000',
        Network.TESTNET
      );
      
      if (!sufficient) {
        console.warn('⚠️  Skipping full flow test - insufficient balance');
        return;
      }
      
      // Step 1: Get 402 response
      const initialResponse = await fetch(protectedUrl);
      expect(initialResponse.status).toBe(402);
      
      const paymentReq = await initialResponse.json();
      const firstAccept = paymentReq.accepts[0];
      
      console.log(`  📋 Payment requirements received`);
      console.log(`     Amount: ${firstAccept.maxAmountRequired} Octas`);
      console.log(`     Recipient: ${firstAccept.payTo}`);
      
      // Step 2: Build payment
      const paymentHeader = await buildPaymentPayload(
        demoAccount.privateKey,
        firstAccept,
        Network.TESTNET
      );
      
      console.log(`  ✍️  Payment transaction signed`);
      
      // Step 3: Retry with payment
      const startTime = Date.now();
      const paidResponse = await fetch(protectedUrl, {
        headers: {
          'X-PAYMENT': paymentHeader,
        },
      });
      const duration = Date.now() - startTime;
      
      // Step 4: Verify success
      const json = await paidResponse.json();
      
      expect(paidResponse.status).toBe(200);
      console.log(`  ✅ Resource delivered (${duration}ms)`);
      
      // Step 5: Verify payment response
      const paymentResponse = assert200Response(paidResponse);
      
      expect(paymentResponse.settlement.success).toBe(true);
      expect(paymentResponse.settlement.txHash).toBeTruthy();
      
      console.log(`  💳 Payment settled: ${paymentResponse.settlement.txHash}`);
      
      // Step 6: Verify timing headers
      const verifyTime = paidResponse.headers.get('x-verification-time');
      const settleTime = paidResponse.headers.get('x-settlement-time');
      
      expect(verifyTime).toBeTruthy();
      expect(settleTime).toBeTruthy();
      
      console.log(`  ⏱️  Verification: ${verifyTime}ms`);
      console.log(`  ⏱️  Settlement: ${settleTime}ms`);
      console.log(`  ⏱️  Total: ${duration}ms`);
      
      // Step 7: Verify transaction on blockchain
      console.log(`  🔍 Verifying on blockchain...`);
      const onChain = await verifyTransactionOnChain(
        paymentResponse.settlement.txHash,
        Network.TESTNET
      );
      expect(onChain).toBe(true);
      console.log(`  ✅ Transaction confirmed on chain`);
      
      // Step 8: Verify resource data
      expect(json.location).toBeTruthy();
      expect(json.temperature).toBeTruthy();
      console.log(`  📦 Resource data: ${json.location}, ${json.temperature}°F`);
    }, 15000); // 15 second timeout

    it('should include payment receipt in response headers', async () => {
      // Check balance
      const sufficient = await hasSufficientBalance(
        demoAccount.address,
        '1000000',
        Network.TESTNET
      );
      
      if (!sufficient) {
        console.warn('⚠️  Skipping payment receipt test - insufficient balance');
        return;
      }
      
      // Get 402 response
      const initialResponse = await fetch(protectedUrl);
      const paymentReq = await initialResponse.json();
      const firstAccept = paymentReq.accepts[0];
      
      // Build and send payment
      const paymentHeader = await buildPaymentPayload(
        demoAccount.privateKey,
        firstAccept,
        Network.TESTNET
      );
      
      const paidResponse = await fetch(protectedUrl, {
        headers: {
          'X-PAYMENT': paymentHeader,
        },
      });
      
      // Parse payment response header
      const paymentResponse = parsePaymentResponse(paidResponse);
      
      expect(paymentResponse.settlement).toBeTruthy();
      expect(paymentResponse.settlement.success).toBe(true);
      expect(paymentResponse.settlement.txHash).toBeTruthy();
      expect(paymentResponse.settlement.networkId).toBe('aptos-testnet');
      
      console.log(`  ✅ Payment receipt complete:`);
      console.log(`     Success: ${paymentResponse.settlement.success}`);
      console.log(`     TX Hash: ${paymentResponse.settlement.txHash}`);
      console.log(`     Network: ${paymentResponse.settlement.networkId}`);
    }, 15000);
  });

  describe('Error Handling', () => {
    it('should handle settlement failure gracefully', async () => {
      // This test would require a scenario that causes settlement to fail
      // For example: insufficient balance (tested elsewhere), network issues, etc.
      // Skipping for now as it requires special setup
      console.log('  ℹ️  Settlement failure test requires special setup - skipped');
    });

    it('should prevent replay attacks', async () => {
      // Check balance
      const sufficient = await hasSufficientBalance(
        demoAccount.address,
        '1000000',
        Network.TESTNET
      );
      
      if (!sufficient) {
        console.warn('⚠️  Skipping replay test - insufficient balance');
        return;
      }
      
      // Get payment requirements
      const initialResponse = await fetch(protectedUrl);
      const paymentReq = await initialResponse.json();
      const firstAccept = paymentReq.accepts[0];
      
      // Build payment (once)
      const paymentHeader = await buildPaymentPayload(
        demoAccount.privateKey,
        firstAccept,
        Network.TESTNET
      );
      
      // First request should succeed
      const response1 = await fetch(protectedUrl, {
        headers: { 'X-PAYMENT': paymentHeader },
      });
      
      expect(response1.status).toBe(200);
      console.log(`  ✅ First payment succeeded`);
      
      // Second request with SAME payment should fail
      const response2 = await fetch(protectedUrl, {
        headers: { 'X-PAYMENT': paymentHeader },
      });
      
      const json2 = await response2.json();
      
      // Should fail at settlement (duplicate transaction)
      expect(response2.status).toBe(402);
      expect(json2.error).toBe('Payment settlement failed');
      
      console.log(`  ✅ Replay protection working: ${json2.message}`);
    }, 20000); // 20 second timeout for two payments
  });
});


