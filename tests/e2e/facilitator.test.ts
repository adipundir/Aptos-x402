/**
 * Facilitator Endpoints Tests
 * 
 * Tests the /verify and /settle endpoints in isolation.
 * These tests directly call the facilitator API without going through middleware.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Network } from '@aptos-labs/ts-sdk';
import {
  buildPaymentPayload,
  buildInvalidPaymentPayload,
  createTestPaymentRequirements,
  assertValidVerifyResponse,
  assertInvalidVerifyResponse,
  assertSuccessfulSettleResponse,
  assertFailedSettleResponse,
  assertTiming,
  verifyTransactionOnChain,
} from '../utils/test-helpers';
import {
  loadDemoAccount,
  loadFacilitatorUrl,
  loadRecipientAddress,
  ensureDemoAccountFunded,
  validateTestEnvironment,
  hasSufficientBalance,
} from '../utils/test-accounts';
import type { VerifyRequest, SettleRequest } from '../../lib/x402-protocol-types';

describe('Facilitator Endpoints', () => {
  let facilitatorUrl: string;
  let demoAccount: any;
  let recipientAddress: string;

  beforeAll(async () => {
    // Validate environment
    validateTestEnvironment();
    
    // Load configuration
    facilitatorUrl = loadFacilitatorUrl();
    recipientAddress = loadRecipientAddress();
    
    // Ensure demo account is funded
    demoAccount = await ensureDemoAccountFunded();
    
    console.log('\n📋 Test Configuration:');
    console.log(`  Facilitator: ${facilitatorUrl}`);
    console.log(`  Demo Account: ${demoAccount.address}`);
    console.log(`  Recipient: ${recipientAddress}`);
  });

  describe('POST /verify', () => {
    it('should validate a correct payment payload', async () => {
      const startTime = Date.now();
      
      // Create payment requirements
      const paymentRequirements = createTestPaymentRequirements({
        payTo: recipientAddress,
        maxAmountRequired: '1000000',
        network: 'aptos-testnet',
      });
      
      // Build valid payment payload
      const paymentHeader = await buildPaymentPayload(
        demoAccount.privateKey,
        paymentRequirements,
        Network.TESTNET
      );
      
      // Call verify endpoint
      const verifyRequest: VerifyRequest = {
        x402Version: 1,
        paymentHeader,
        paymentRequirements,
      };
      
      const response = await fetch(`${facilitatorUrl}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyRequest),
      });
      
      const json = await response.json();
      const duration = Date.now() - startTime;
      
      // Assertions
      expect(response.status).toBe(200);
      assertValidVerifyResponse(json);
      assertTiming(duration, { min: 0, max: 100 }, 'Verification');
      
      // Check timing header
      const timingHeader = response.headers.get('x-verification-time');
      expect(timingHeader).toBeTruthy();
      console.log(`  ⏱️  Verification took ${timingHeader}ms (header)`);
    });

    it('should reject invalid base64 encoding', async () => {
      const paymentRequirements = createTestPaymentRequirements();
      const paymentHeader = buildInvalidPaymentPayload('bad-base64');
      
      const verifyRequest: VerifyRequest = {
        x402Version: 1,
        paymentHeader,
        paymentRequirements,
      };
      
      const response = await fetch(`${facilitatorUrl}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyRequest),
      });
      
      const json = await response.json();
      
      expect(response.status).toBe(200);  // Verify endpoint returns 200 with isValid=false
      assertInvalidVerifyResponse(json, 'base64');
    });

    it('should reject invalid JSON in payload', async () => {
      const paymentRequirements = createTestPaymentRequirements();
      const paymentHeader = buildInvalidPaymentPayload('invalid-json');
      
      const verifyRequest: VerifyRequest = {
        x402Version: 1,
        paymentHeader,
        paymentRequirements,
      };
      
      const response = await fetch(`${facilitatorUrl}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyRequest),
      });
      
      const json = await response.json();
      
      expect(response.status).toBe(200);
      assertInvalidVerifyResponse(json, 'JSON');
    });

    it('should reject missing signature field', async () => {
      const paymentRequirements = createTestPaymentRequirements();
      const paymentHeader = buildInvalidPaymentPayload('missing-signature');
      
      const verifyRequest: VerifyRequest = {
        x402Version: 1,
        paymentHeader,
        paymentRequirements,
      };
      
      const response = await fetch(`${facilitatorUrl}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyRequest),
      });
      
      const json = await response.json();
      
      expect(response.status).toBe(200);
      assertInvalidVerifyResponse(json, 'signature');
    });

    it('should reject wrong x402 version', async () => {
      const paymentRequirements = createTestPaymentRequirements();
      const paymentHeader = buildInvalidPaymentPayload('wrong-version');
      
      const verifyRequest: VerifyRequest = {
        x402Version: 1,
        paymentHeader,
        paymentRequirements,
      };
      
      const response = await fetch(`${facilitatorUrl}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyRequest),
      });
      
      const json = await response.json();
      
      expect(response.status).toBe(200);
      assertInvalidVerifyResponse(json, 'version');
    });

    it('should reject wrong scheme', async () => {
      const paymentRequirements = createTestPaymentRequirements();
      const paymentHeader = buildInvalidPaymentPayload('wrong-scheme');
      
      const verifyRequest: VerifyRequest = {
        x402Version: 1,
        paymentHeader,
        paymentRequirements,
      };
      
      const response = await fetch(`${facilitatorUrl}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyRequest),
      });
      
      const json = await response.json();
      
      expect(response.status).toBe(200);
      assertInvalidVerifyResponse(json, 'scheme');
    });

    it('should reject empty signature/transaction data', async () => {
      const paymentRequirements = createTestPaymentRequirements();
      const paymentHeader = buildInvalidPaymentPayload('empty-data');
      
      const verifyRequest: VerifyRequest = {
        x402Version: 1,
        paymentHeader,
        paymentRequirements,
      };
      
      const response = await fetch(`${facilitatorUrl}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyRequest),
      });
      
      const json = await response.json();
      
      expect(response.status).toBe(200);
      assertInvalidVerifyResponse(json, 'Empty');
    });
  });

  describe('POST /settle', () => {
    it('should successfully settle a valid payment', async () => {
      const startTime = Date.now();
      
      // Check balance first
      const sufficient = await hasSufficientBalance(
        demoAccount.address,
        '1000000',
        Network.TESTNET
      );
      
      if (!sufficient) {
        console.warn('⚠️  Skipping settlement test - insufficient balance');
        return;
      }
      
      // Create payment requirements
      const paymentRequirements = createTestPaymentRequirements({
        payTo: recipientAddress,
        maxAmountRequired: '1000000',
        network: 'aptos-testnet',
      });
      
      // Build valid payment payload
      const paymentHeader = await buildPaymentPayload(
        demoAccount.privateKey,
        paymentRequirements,
        Network.TESTNET
      );
      
      // Call settle endpoint
      const settleRequest: SettleRequest = {
        x402Version: 1,
        paymentHeader,
        paymentRequirements,
      };
      
      const response = await fetch(`${facilitatorUrl}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settleRequest),
      });
      
      const json = await response.json();
      const duration = Date.now() - startTime;
      
      // Assertions
      expect(response.status).toBe(200);
      const settlement = assertSuccessfulSettleResponse(json);
      assertTiming(duration, { min: 500, max: 5000 }, 'Settlement');
      
      // Check timing header
      const timingHeader = response.headers.get('x-settlement-time');
      expect(timingHeader).toBeTruthy();
      console.log(`  ⏱️  Settlement took ${timingHeader}ms (header)`);
      
      // Verify transaction on blockchain
      console.log(`  🔍 Verifying transaction on chain: ${settlement.txHash}`);
      const onChain = await verifyTransactionOnChain(
        settlement.txHash!,
        Network.TESTNET
      );
      expect(onChain).toBe(true);
      console.log(`  ✅ Transaction confirmed on blockchain`);
    }, 10000); // 10 second timeout for blockchain interaction

    it('should handle duplicate transaction (replay protection)', async () => {
      // Check balance first
      const sufficient = await hasSufficientBalance(
        demoAccount.address,
        '1000000',
        Network.TESTNET
      );
      
      if (!sufficient) {
        console.warn('⚠️  Skipping duplicate transaction test - insufficient balance');
        return;
      }
      
      // Create payment requirements
      const paymentRequirements = createTestPaymentRequirements({
        payTo: recipientAddress,
        maxAmountRequired: '1000000',
        network: 'aptos-testnet',
      });
      
      // Build valid payment payload
      const paymentHeader = await buildPaymentPayload(
        demoAccount.privateKey,
        paymentRequirements,
        Network.TESTNET
      );
      
      const settleRequest: SettleRequest = {
        x402Version: 1,
        paymentHeader,
        paymentRequirements,
      };
      
      // First settlement should succeed
      const response1 = await fetch(`${facilitatorUrl}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settleRequest),
      });
      
      const json1 = await response1.json();
      expect(response1.status).toBe(200);
      assertSuccessfulSettleResponse(json1);
      
      // Second settlement with SAME transaction should fail
      const response2 = await fetch(`${facilitatorUrl}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settleRequest),
      });
      
      const json2 = await response2.json();
      
      // Should fail with sequence number or already used error
      expect(response2.status).toBeGreaterThanOrEqual(400);
      assertFailedSettleResponse(json2);
      
      console.log(`  ✅ Replay protection working: ${json2.error}`);
    }, 15000); // 15 second timeout for two blockchain interactions

    it('should reject settlement with invalid BCS data', async () => {
      const paymentRequirements = createTestPaymentRequirements();
      const paymentHeader = buildInvalidPaymentPayload('empty-data');
      
      const settleRequest: SettleRequest = {
        x402Version: 1,
        paymentHeader,
        paymentRequirements,
      };
      
      const response = await fetch(`${facilitatorUrl}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settleRequest),
      });
      
      const json = await response.json();
      
      expect(response.status).toBeGreaterThanOrEqual(400);
      assertFailedSettleResponse(json);
    });
  });
});


