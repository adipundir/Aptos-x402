/**
 * x402-axios for Aptos
 * 
 * Simple wrapper - just provide private key and URL!
 * 
 * Usage:
 * ```typescript
 * import { x402axios } from '@adipundir/aptos-x402';
 * 
 * const response = await x402axios({
 *   privateKey: '0x...',
 *   url: 'https://api.example.com/protected/data'
 * });
 * 
 * console.log(response.data);
 * ```
 */

import {
  Account,
  Aptos,
  AptosConfig,
  Network,
  Ed25519PrivateKey,
} from "@aptos-labs/ts-sdk";

export interface WithPaymentInterceptorOptions {
  /** Private key for signing transactions OR Aptos account */
  privateKey?: string;
  account?: Account;
  /** URL to request */
  url: string;
  /** HTTP method (default: GET) */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Request body (for POST/PUT/PATCH) */
  body?: any;
  /** Additional headers */
  headers?: Record<string, string>;
}

export interface X402Response<T = any> {
  status: number;
  data: T;
  headers: Record<string, string>;
  paymentInfo?: {
    transactionHash: string;
    amount: string;
    recipient: string;
    settled: boolean;
  };
}

export interface X402PaymentResponse {
  settlement?: {
    txHash: string;
    networkId: string;
    success: boolean;
  };
}

/**
 * Decode X-Payment-Response header
 */
export function decodeXPaymentResponse(header: string | null): X402PaymentResponse | null {
  if (!header) return null;
  
  try {
    return JSON.parse(Buffer.from(header, 'base64').toString('utf-8'));
  } catch (error) {
    return null;
  }
}

/**
 * Simple x402-axios wrapper for Aptos
 * Just provide privateKey (or account) and url - everything else is automatic!
 */
export async function x402axios<T = any>(
  options: WithPaymentInterceptorOptions
): Promise<X402Response<T>> {
  const { privateKey, account, url, method = 'GET', body, headers = {} } = options;

  console.log('[x402-axios] Making request to:', url);

  // Step 1: Make initial request (no payment)
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    init.body = JSON.stringify(body);
  }

  let response = await fetch(url, init);
  let data = await response.json() as any;

  console.log(`[x402-axios] Initial response: ${response.status}`);

  // If not 402, return immediately (no payment required)
  if (response.status !== 402) {
    console.log('[x402-axios] No payment required');
    return {
      status: response.status,
      data: data as T,
      headers: Object.fromEntries(response.headers.entries()),
    };
  }

  console.log('[x402-axios] Received 402 Payment Required');

  // Step 2: Extract payment requirements from 402 response
  const paymentReqs = data.accepts?.[0] || data;
  const recipient = paymentReqs.payTo || paymentReqs.paymentAddress;
  const amount = paymentReqs.maxAmountRequired || paymentReqs.price;
  const networkId = paymentReqs.network || 'aptos-testnet';
  const scheme = paymentReqs.scheme || 'exact';

  if (!recipient || !amount) {
    throw new Error('Invalid 402 response: missing payment requirements');
  }

  console.log('[x402-axios] Payment requirements:', {
    scheme,
    network: networkId,
    amount: `${amount} Octas`,
    recipient: recipient.slice(0, 10) + '...',
  });

  // Step 3: Determine network from 402 response
  const networkMap: Record<string, Network> = {
    'aptos-testnet': Network.TESTNET,
    'aptos-mainnet': Network.MAINNET,
    'aptos-devnet': Network.DEVNET,
  };
  const network = networkMap[networkId] || Network.TESTNET;

  // Step 4: Initialize Aptos client based on discovered network
  const aptosConfig = new AptosConfig({ network });
  const aptos = new Aptos(aptosConfig);

  // Create account from private key or use provided account
  let aptosAccount: Account;
  if (account) {
    aptosAccount = account;
  } else if (privateKey) {
    const privateKeyObj = new Ed25519PrivateKey(privateKey);
    aptosAccount = Account.fromPrivateKey({ privateKey: privateKeyObj });
  } else {
    throw new Error('Either privateKey or account must be provided');
  }

  console.log(`[x402-axios] Building transaction for ${amount} Octas to ${recipient.slice(0, 10)}...`);

  // Step 5: Build transaction based on scheme
  let transaction;
  if (scheme === 'exact') {
    transaction = await aptos.transaction.build.simple({
      sender: aptosAccount.accountAddress,
      data: {
        function: "0x1::aptos_account::transfer",
        functionArguments: [recipient, amount],
      },
    });
  } else {
    throw new Error(`Unsupported payment scheme: ${scheme}`);
  }

  console.log('[x402-axios] Signing transaction...');

  // Step 6: Sign transaction
  const senderAuthenticator = aptos.transaction.sign({ 
    signer: aptosAccount, 
    transaction 
  });

  // Step 7: Serialize transaction and signature separately
  const transactionBytes = transaction.bcsToBytes();
  const signatureBytes = senderAuthenticator.bcsToBytes();
  
  const transactionBase64 = Buffer.from(transactionBytes).toString('base64');
  const signatureBase64 = Buffer.from(signatureBytes).toString('base64');

  // Step 8: Create x402 PaymentPayload
  const paymentPayload = {
    x402Version: 1,
    scheme,
    network: networkId,
    payload: {
      transaction: transactionBase64,
      signature: signatureBase64,
    },
  };

  // Step 9: Encode as base64 for X-PAYMENT header
  const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
  
  console.log(`[x402-axios] Retrying with payment (header: ${paymentHeader.length} chars)...`);

  // Step 10: Retry request with X-PAYMENT header
  const paidInit: RequestInit = {
    ...init,
    headers: {
      ...init.headers,
      'X-PAYMENT': paymentHeader,
    },
  };

  response = await fetch(url, paidInit);
  data = await response.json() as any;

  console.log(`[x402-axios] Payment response: ${response.status}`);

  // Step 11: Extract payment info from X-Payment-Response header
  let paymentInfo;
  const paymentResponseHeader = response.headers.get('x-payment-response');
  
  if (paymentResponseHeader) {
    const decoded = decodeXPaymentResponse(paymentResponseHeader);
    if (decoded?.settlement?.txHash) {
      paymentInfo = {
        transactionHash: decoded.settlement.txHash,
        amount: amount,
        recipient: recipient,
        settled: decoded.settlement.success === true,
      };
      
      console.log(`[x402-axios] Payment settled: ${paymentInfo.transactionHash}`);
    }
  }

  return {
    status: response.status,
    data: data as T,
    headers: Object.fromEntries(response.headers.entries()),
    paymentInfo,
  };
}
