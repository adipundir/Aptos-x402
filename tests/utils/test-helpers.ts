/**
 * Test Helpers for x402 Protocol Testing
 * 
 * Shared utilities for building transactions, asserting responses,
 * and managing test state across integration tests.
 */

import {
  Account,
  Aptos,
  AptosConfig,
  Network,
  Ed25519PrivateKey,
} from "@aptos-labs/ts-sdk";
import type {
  PaymentRequiredResponse,
  PaymentRequirements,
  PaymentPayload,
  VerifyRequest,
  VerifyResponse,
  SettleRequest,
  SettleResponse,
} from "../../lib/x402-protocol-types";
import { X402_VERSION, APTOS_SCHEME } from "../../lib/x402-protocol-types";

/**
 * Build a signed payment payload for x402 protocol
 */
export async function buildPaymentPayload(
  privateKey: string,
  paymentRequirements: PaymentRequirements,
  network: Network = Network.TESTNET
): Promise<string> {
  // Initialize Aptos SDK
  const config = new AptosConfig({ network });
  const aptos = new Aptos(config);
  
  // Create account from private key
  const cleanKey = privateKey.replace(/^0x/, "");
  const account = Account.fromPrivateKey({
    privateKey: new Ed25519PrivateKey(cleanKey)
  });

  // Build transaction
  const transaction = await aptos.transaction.build.simple({
    sender: account.accountAddress,
    data: {
      function: "0x1::aptos_account::transfer",
      functionArguments: [
        paymentRequirements.payTo,
        paymentRequirements.maxAmountRequired
      ],
    },
  });

  // Sign transaction
  const authenticator = aptos.transaction.sign({ 
    signer: account, 
    transaction 
  });

  // Serialize to BCS
  const transactionBytes = transaction.bcsToBytes();
  const signatureBytes = authenticator.bcsToBytes();
  
  // Base64 encode
  const transactionBase64 = Buffer.from(transactionBytes).toString('base64');
  const signatureBase64 = Buffer.from(signatureBytes).toString('base64');
  
  // Create payment payload
  const paymentPayload: PaymentPayload = {
    x402Version: X402_VERSION,
    scheme: APTOS_SCHEME,
    network: paymentRequirements.network,
    payload: {
      signature: signatureBase64,
      transaction: transactionBase64
    }
  };
  
  // Base64 encode entire payload
  return Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
}

/**
 * Create a malformed payment payload for testing error cases
 */
export function buildInvalidPaymentPayload(invalidType: 'bad-base64' | 'invalid-json' | 'missing-signature' | 'wrong-version' | 'wrong-scheme' | 'empty-data'): string {
  switch (invalidType) {
    case 'bad-base64':
      return 'this is not valid base64!!!';
    
    case 'invalid-json':
      return Buffer.from('{ invalid json }').toString('base64');
    
    case 'missing-signature':
      const missingSignature = {
        x402Version: X402_VERSION,
        scheme: APTOS_SCHEME,
        network: 'aptos-testnet',
        payload: {
          transaction: 'validbase64data'
        }
      };
      return Buffer.from(JSON.stringify(missingSignature)).toString('base64');
    
    case 'wrong-version':
      const wrongVersion = {
        x402Version: 999,
        scheme: APTOS_SCHEME,
        network: 'aptos-testnet',
        payload: {
          signature: 'validbase64data',
          transaction: 'validbase64data'
        }
      };
      return Buffer.from(JSON.stringify(wrongVersion)).toString('base64');
    
    case 'wrong-scheme':
      const wrongScheme = {
        x402Version: X402_VERSION,
        scheme: 'invalid-scheme',
        network: 'aptos-testnet',
        payload: {
          signature: 'validbase64data',
          transaction: 'validbase64data'
        }
      };
      return Buffer.from(JSON.stringify(wrongScheme)).toString('base64');
    
    case 'empty-data':
      const emptyData = {
        x402Version: X402_VERSION,
        scheme: APTOS_SCHEME,
        network: 'aptos-testnet',
        payload: {
          signature: Buffer.from([]).toString('base64'),
          transaction: Buffer.from([]).toString('base64')
        }
      };
      return Buffer.from(JSON.stringify(emptyData)).toString('base64');
  }
}

/**
 * Assert that a response is a valid 402 Payment Required
 */
export function assert402Response(response: Response, json: any) {
  if (response.status !== 402) {
    throw new Error(`Expected 402, got ${response.status}: ${JSON.stringify(json)}`);
  }
  
  const paymentReq: PaymentRequiredResponse = json;
  
  if (!paymentReq.x402Version) {
    throw new Error('Missing x402Version in 402 response');
  }
  
  if (!Array.isArray(paymentReq.accepts) || paymentReq.accepts.length === 0) {
    throw new Error('Missing or empty accepts array in 402 response');
  }
  
  const firstAccept = paymentReq.accepts[0];
  if (!firstAccept.scheme || !firstAccept.network || !firstAccept.maxAmountRequired || !firstAccept.payTo) {
    throw new Error('Invalid payment requirements structure');
  }
  
  return paymentReq;
}

/**
 * Assert that a response is a successful 200 with resource
 */
export function assert200Response(response: Response) {
  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}`);
  }
  
  // Check for X-PAYMENT-RESPONSE header
  const paymentResponseHeader = response.headers.get('x-payment-response');
  if (!paymentResponseHeader) {
    throw new Error('Missing X-PAYMENT-RESPONSE header in successful response');
  }
  
  // Decode and validate payment response
  const paymentResponse = JSON.parse(
    Buffer.from(paymentResponseHeader, 'base64').toString()
  );
  
  if (!paymentResponse.settlement) {
    throw new Error('Missing settlement in payment response');
  }
  
  if (!paymentResponse.settlement.success) {
    throw new Error(`Settlement failed: ${paymentResponse.settlement.error}`);
  }
  
  if (!paymentResponse.settlement.txHash) {
    throw new Error('Missing transaction hash in settlement');
  }
  
  return paymentResponse;
}

/**
 * Assert that verify response is valid
 */
export function assertValidVerifyResponse(json: any) {
  const verifyResponse: VerifyResponse = json;
  
  if (verifyResponse.isValid !== true) {
    throw new Error(`Verification failed: ${verifyResponse.invalidReason}`);
  }
  
  if (verifyResponse.invalidReason !== null) {
    throw new Error('invalidReason should be null when isValid is true');
  }
  
  return verifyResponse;
}

/**
 * Assert that verify response is invalid
 */
export function assertInvalidVerifyResponse(json: any, expectedReason?: string) {
  const verifyResponse: VerifyResponse = json;
  
  if (verifyResponse.isValid !== false) {
    throw new Error('Expected isValid to be false');
  }
  
  if (!verifyResponse.invalidReason) {
    throw new Error('Missing invalidReason when isValid is false');
  }
  
  if (expectedReason && !verifyResponse.invalidReason.includes(expectedReason)) {
    throw new Error(`Expected reason to contain "${expectedReason}", got "${verifyResponse.invalidReason}"`);
  }
  
  return verifyResponse;
}

/**
 * Assert that settle response is successful
 */
export function assertSuccessfulSettleResponse(json: any) {
  const settleResponse: SettleResponse = json;
  
  if (settleResponse.success !== true) {
    throw new Error(`Settlement failed: ${settleResponse.error}`);
  }
  
  if (!settleResponse.txHash) {
    throw new Error('Missing transaction hash in successful settlement');
  }
  
  if (!settleResponse.networkId) {
    throw new Error('Missing network ID in successful settlement');
  }
  
  return settleResponse;
}

/**
 * Assert that settle response is failed
 */
export function assertFailedSettleResponse(json: any, expectedError?: string) {
  const settleResponse: SettleResponse = json;
  
  if (settleResponse.success !== false) {
    throw new Error('Expected success to be false');
  }
  
  if (!settleResponse.error) {
    throw new Error('Missing error message when success is false');
  }
  
  if (expectedError && !settleResponse.error.includes(expectedError)) {
    throw new Error(`Expected error to contain "${expectedError}", got "${settleResponse.error}"`);
  }
  
  return settleResponse;
}

/**
 * Wait for a specified duration (for blockchain confirmations)
 */
export async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get current timestamp in seconds
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Verify transaction on blockchain
 */
export async function verifyTransactionOnChain(
  txHash: string,
  network: Network = Network.TESTNET
): Promise<boolean> {
  const config = new AptosConfig({ network });
  const aptos = new Aptos(config);
  
  try {
    const txn = await aptos.transaction.getTransactionByHash({
      transactionHash: txHash,
    });
    
    return 'success' in txn && txn.success === true;
  } catch (error) {
    console.error('Failed to verify transaction on chain:', error);
    return false;
  }
}

/**
 * Get account balance
 */
export async function getAccountBalance(
  address: string,
  network: Network = Network.TESTNET
): Promise<number> {
  const config = new AptosConfig({ network });
  const aptos = new Aptos(config);
  
  try {
    return await aptos.getAccountAPTAmount({
      accountAddress: address,
    });
  } catch (error) {
    console.error('Failed to get account balance:', error);
    return 0;
  }
}

/**
 * Create a test payment requirements object
 */
export function createTestPaymentRequirements(
  overrides?: Partial<PaymentRequirements>
): PaymentRequirements {
  return {
    scheme: APTOS_SCHEME,
    network: 'aptos-testnet',
    maxAmountRequired: '1000000',
    resource: 'http://localhost:3000/api/protected/weather',
    description: 'Test protected resource',
    mimeType: 'application/json',
    payTo: process.env.PAYMENT_RECIPIENT_ADDRESS || '0x1',
    maxTimeoutSeconds: 60,
    extra: null,
    ...overrides
  };
}

/**
 * Assert timing is within expected range
 */
export function assertTiming(actual: number, expected: { min: number, max: number }, operation: string) {
  if (actual < expected.min) {
    console.warn(`⚠️  ${operation} was faster than expected: ${actual}ms < ${expected.min}ms`);
  }
  
  if (actual > expected.max) {
    throw new Error(`${operation} took too long: ${actual}ms > ${expected.max}ms`);
  }
  
  console.log(`✅ ${operation} timing OK: ${actual}ms (expected ${expected.min}-${expected.max}ms)`);
}

/**
 * Parse X-PAYMENT-RESPONSE header from response
 */
export function parsePaymentResponse(response: Response) {
  const header = response.headers.get('x-payment-response');
  if (!header) {
    throw new Error('Missing X-PAYMENT-RESPONSE header');
  }
  
  return JSON.parse(Buffer.from(header, 'base64').toString());
}


