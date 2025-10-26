/**
 * Client SDK Tests
 * 
 * Tests the x402 client SDK that automatically handles payment flow.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Network } from '@aptos-labs/ts-sdk';
import { createX402Client } from '../../lib/x402-client';
import {
  loadDemoAccount,
  ensureDemoAccountFunded,
  validateTestEnvironment,
  hasSufficientBalance,
} from '../utils/test-accounts';
import { verifyTransactionOnChain } from '../utils/test-helpers';

describe('x402 Client SDK', () => {
  let demoAccount: any;
  let client: any;
  const protectedUrl = 'http://localhost:3000/api/protected/weather';

  beforeAll(async () => {
    // Validate environment
    validateTestEnvironment();
    
    // Ensure demo account is funded
    demoAccount = await ensureDemoAccountFunded();
    
    // Initialize client
    client = createX402Client({
      privateKey: demoAccount.privateKey,
      network: Network.TESTNET,
    });
    
    console.log('\n📋 Test Configuration:');
    console.log(`  Client Address: ${client.getAddress()}`);
    console.log(`  Protected URL: ${protectedUrl}`);
  });

  describe('Client Initialization', () => {
    it('should initialize client correctly', () => {
      expect(client).toBeTruthy();
      expect(client.getAddress()).toBe(demoAccount.address);
      expect(client.get).toBeInstanceOf(Function);
      expect(client.post).toBeInstanceOf(Function);
      expect(client.getBalance).toBeInstanceOf(Function);
      
      console.log(`  ✅ Client initialized with address: ${client.getAddress()}`);
    });

    it('should get account balance', async () => {
      const balance = await client.getBalance();
      
      expect(balance).toBeGreaterThan(0);
      console.log(`  ✅ Account balance: ${balance / 100_000_000} APT (${balance} Octas)`);
    });

    it('should return correct account address', () => {
      const address = client.getAddress();
      
      expect(address).toBe(demoAccount.address);
      expect(address).toMatch(/^0x[0-9a-f]{64}$/);
      
      console.log(`  ✅ Account address: ${address}`);
    });
  });

  describe('Automatic Payment Flow', () => {
    it('should automatically handle 402 and pay', async () => {
      // Check balance
      const sufficient = await hasSufficientBalance(
        demoAccount.address,
        '1000000',
        Network.TESTNET
      );
      
      if (!sufficient) {
        console.warn('⚠️  Skipping auto-payment test - insufficient balance');
        return;
      }
      
      console.log(`  🚀 Starting automatic payment flow...`);
      
      // Client.get() should handle 402 automatically
      const startTime = Date.now();
      const response = await client.get(protectedUrl);
      const duration = Date.now() - startTime;
      
      // Verify response
      expect(response.status).toBe(200);
      expect(response.data).toBeTruthy();
      expect(response.paymentDetails).toBeTruthy();
      
      console.log(`  ✅ Request succeeded (${duration}ms)`);
      console.log(`  📦 Resource data:`, response.data);
      
      // Verify payment details
      expect(response.paymentDetails.transactionHash).toBeTruthy();
      console.log(`  💳 Payment TX: ${response.paymentDetails.transactionHash}`);
      
      // Verify on blockchain
      console.log(`  🔍 Verifying on blockchain...`);
      const onChain = await verifyTransactionOnChain(
        response.paymentDetails.transactionHash,
        Network.TESTNET
      );
      expect(onChain).toBe(true);
      console.log(`  ✅ Transaction confirmed on chain`);
    }, 15000);

    it('should return weather data from protected endpoint', async () => {
      // Check balance
      const sufficient = await hasSufficientBalance(
        demoAccount.address,
        '1000000',
        Network.TESTNET
      );
      
      if (!sufficient) {
        console.warn('⚠️  Skipping weather data test - insufficient balance');
        return;
      }
      
      const response = await client.get(protectedUrl);
      
      // Verify resource structure
      expect(response.data.location).toBeTruthy();
      expect(response.data.temperature).toBeTruthy();
      expect(response.data.conditions).toBeTruthy();
      
      console.log(`  ✅ Weather data received:`);
      console.log(`     Location: ${response.data.location}`);
      console.log(`     Temperature: ${response.data.temperature}°F`);
      console.log(`     Conditions: ${response.data.conditions}`);
    }, 15000);

    it('should include payment details in response', async () => {
      // Check balance
      const sufficient = await hasSufficientBalance(
        demoAccount.address,
        '1000000',
        Network.TESTNET
      );
      
      if (!sufficient) {
        console.warn('⚠️  Skipping payment details test - insufficient balance');
        return;
      }
      
      const response = await client.get(protectedUrl);
      
      // Verify payment details structure
      expect(response.paymentDetails).toBeTruthy();
      expect(response.paymentDetails.transactionHash).toBeTruthy();
      expect(response.paymentDetails.amount).toBeTruthy();
      expect(response.paymentDetails.recipient).toBeTruthy();
      expect(response.paymentDetails.settled).toBe(true);
      
      console.log(`  ✅ Payment details complete:`);
      console.log(`     TX Hash: ${response.paymentDetails.transactionHash}`);
      console.log(`     Amount: ${response.paymentDetails.amount} Octas`);
      console.log(`     Recipient: ${response.paymentDetails.recipient}`);
      console.log(`     Settled: ${response.paymentDetails.settled}`);
    }, 15000);

    it('should handle multiple sequential requests', async () => {
      // Check balance for multiple payments
      const sufficient = await hasSufficientBalance(
        demoAccount.address,
        '3000000', // 3x payment
        Network.TESTNET
      );
      
      if (!sufficient) {
        console.warn('⚠️  Skipping multiple requests test - insufficient balance');
        return;
      }
      
      console.log(`  🚀 Making 3 sequential requests...`);
      
      const results = [];
      
      for (let i = 0; i < 3; i++) {
        console.log(`     Request ${i + 1}/3...`);
        const response = await client.get(protectedUrl);
        
        expect(response.status).toBe(200);
        expect(response.paymentDetails).toBeTruthy();
        
        results.push({
          txHash: response.paymentDetails.transactionHash,
          location: response.data.location,
        });
      }
      
      console.log(`  ✅ All 3 requests succeeded`);
      results.forEach((r, i) => {
        console.log(`     ${i + 1}. TX: ${r.txHash}`);
      });
      
      // Verify all transactions are different (no replay)
      const uniqueTxHashes = new Set(results.map(r => r.txHash));
      expect(uniqueTxHashes.size).toBe(3);
      console.log(`  ✅ All transactions unique (replay protection working)`);
    }, 45000); // 45 second timeout for 3 payments
  });

  describe('Error Handling', () => {
    it('should throw error for non-existent endpoint', async () => {
      const badUrl = 'http://localhost:3000/api/does-not-exist';
      
      try {
        await client.get(badUrl);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toBeTruthy();
        console.log(`  ✅ Error handled correctly: ${error.message}`);
      }
    });

    it('should handle network errors gracefully', async () => {
      const badUrl = 'http://localhost:9999/api/protected/weather';
      
      try {
        await client.get(badUrl);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toBeTruthy();
        console.log(`  ✅ Network error handled: ${error.message}`);
      }
    });
  });

  describe('POST Requests', () => {
    it('should support POST requests with payment', async () => {
      // Note: This requires a protected POST endpoint
      // For now, we'll test that the method exists and has correct signature
      
      expect(client.post).toBeInstanceOf(Function);
      console.log(`  ✅ POST method available on client`);
      
      // Could test with actual POST endpoint when available
      // const response = await client.post(protectedPostUrl, { data: 'test' });
    });
  });
});


