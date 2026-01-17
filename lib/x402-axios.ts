/**
 * x402axios - HTTP Client for Aptos with Automatic Payment Handling
 * 
 * Drop-in replacement for axios with automatic x402 payment handling.
 * When a 402 Payment Required response is received, it builds,
 * signs, and submits the payment transaction automatically.
 */

import {
  Account,
  Aptos,
  AptosConfig,
  Network,
  Ed25519PrivateKey,
} from "@aptos-labs/ts-sdk";

import {
  X402_VERSION,
  PAYMENT_REQUIRED_HEADER,
  PAYMENT_HEADER,
  PAYMENT_RESPONSE_HEADER,
  validateCAIP2Network,
  getAptosChainId,
  type PaymentPayload,
  type PaymentRequirements,
  type PaymentRequiredResponse,
} from "./x402-protocol-types";

// ============================================
// TYPES
// ============================================

export interface X402RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  privateKey?: string;
  account?: Account;
}

export interface X402Response<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  paymentInfo?: {
    transactionHash: string;
    amount: string;
    recipient: string;
    network: string;
    payer: string;
  };
}

export interface X402PaymentResponse {
  success: boolean;
  transaction: string | null;
  network: string | null;
  payer: string | null;
}

// ============================================
// CACHES
// ============================================

const aptosClients = new Map<number, Aptos>();
const accounts = new Map<string, Account>();

function getAptos(chainId: number): Aptos {
  if (!aptosClients.has(chainId)) {
    const network = chainId === 1 ? Network.MAINNET : Network.TESTNET;
    aptosClients.set(chainId, new Aptos(new AptosConfig({ network })));
  }
  return aptosClients.get(chainId)!;
}

function getAccount(privateKey: string): Account {
  if (!accounts.has(privateKey)) {
    accounts.set(privateKey, Account.fromPrivateKey({
      privateKey: new Ed25519PrivateKey(privateKey)
    }));
  }
  return accounts.get(privateKey)!;
}

// ============================================
// HELPERS
// ============================================

function headersToObject(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export function decodePaymentResponse(header: string): X402PaymentResponse | null {
  try {
    return JSON.parse(Buffer.from(header, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

async function buildTransaction(
  aptos: Aptos,
  sender: Account,
  recipient: string,
  amount: bigint,
  asset: string,
  sponsored: boolean
) {
  // Add timeout to prevent hanging
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Transaction build timeout (15s). Check if the asset address is valid.')), 15000)
  );

  try {
    const buildPromise = aptos.transaction.build.simple({
      sender: sender.accountAddress,
      withFeePayer: sponsored,
      data: {
        function: "0x1::primary_fungible_store::transfer",
        typeArguments: ["0x1::fungible_asset::Metadata"],
        functionArguments: [asset, recipient, amount],
      },
    });

    return await Promise.race([buildPromise, timeoutPromise]) as any;
  } catch (error: any) {
    console.error('[CLIENT] ❌ Transaction build failed:', error.message);
    throw error;
  }
}

function serializeTransaction(transaction: any, signature: any): string {
  const txBytes = transaction.bcsToBytes();
  const sigBytes = signature.bcsToBytes();

  const combined = new Uint8Array(4 + txBytes.length + sigBytes.length);
  const len = txBytes.length;
  combined[0] = (len >> 24) & 0xff;
  combined[1] = (len >> 16) & 0xff;
  combined[2] = (len >> 8) & 0xff;
  combined[3] = len & 0xff;
  combined.set(txBytes, 4);
  combined.set(sigBytes, 4 + txBytes.length);

  return Buffer.from(combined).toString('base64');
}

async function parseResponse(response: Response): Promise<any> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ============================================
// CORE REQUEST FUNCTION
// ============================================

async function request<T = any>(
  url: string,
  config: X402RequestConfig = {}
): Promise<X402Response<T>> {
  const { method = 'GET', headers = {}, body, privateKey, account } = config;

  console.log('\n' + '='.repeat(60));
  console.log('🌐 [CLIENT] x402axios request');
  console.log('='.repeat(60));
  console.log('[CLIENT] URL:', url);
  console.log('[CLIENT] Method:', method);

  const requestInit: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  };

  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    requestInit.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  // First request - without payment
  console.log('[CLIENT] 📤 Sending initial request (no payment)...');
  let response = await fetch(url, requestInit);
  let data = await parseResponse(response);

  console.log('[CLIENT] 📥 Response status:', response.status);

  // Not 402 - return immediately
  if (response.status !== 402) {
    console.log('[CLIENT] ✅ No payment required, returning data');
    console.log('='.repeat(60) + '\n');
    return {
      data: data as T,
      status: response.status,
      headers: headersToObject(response.headers),
    };
  }

  // Handle 402 Payment Required
  console.log('[CLIENT] 💰 Received 402 - Payment Required!');

  if (!privateKey && !account) {
    console.log('[CLIENT] ❌ No privateKey or account provided!');
    throw new Error('Payment required but no privateKey or account provided');
  }

  // V2: Read payment requirements from PAYMENT-REQUIRED header
  const paymentRequiredHeader = response.headers.get(PAYMENT_REQUIRED_HEADER.toLowerCase()) ||
    response.headers.get(PAYMENT_REQUIRED_HEADER);

  let paymentRequired: PaymentRequiredResponse;
  if (paymentRequiredHeader) {
    // V2: Decode from header (base64 JSON)
    try {
      paymentRequired = JSON.parse(Buffer.from(paymentRequiredHeader, 'base64').toString('utf-8'));
      console.log('[CLIENT] ✅ Read payment requirements from PAYMENT-REQUIRED header (V2)');
    } catch {
      console.log('[CLIENT] ⚠️ Failed to decode header, falling back to body');
      paymentRequired = data;
    }
  } else {
    // V1 fallback: Read from body
    console.log('[CLIENT] ⚠️ No PAYMENT-REQUIRED header, reading from body (V1 fallback)');
    paymentRequired = data;
  }

  return handlePayment(url, requestInit, paymentRequired, privateKey, account);
}

async function handlePayment(
  url: string,
  requestInit: RequestInit,
  paymentRequired: any,
  privateKey?: string,
  account?: Account
): Promise<X402Response> {
  const reqs: PaymentRequirements = paymentRequired.accepts?.[0] || paymentRequired;

  console.log('[CLIENT] Payment requirements received:', {
    scheme: reqs.scheme,
    network: reqs.network,
    amount: reqs.amount,
    asset: reqs.asset?.substring(0, 30) + '...',
    recipient: reqs.payTo?.substring(0, 20) + '...',
    sponsored: reqs.extra?.sponsored,
  });

  const { network, payTo: recipient, amount, asset } = reqs;

  if (!asset) {
    console.log('[CLIENT] ❌ No asset specified!');
    throw new Error('Asset not specified in payment requirements');
  }

  const sponsored = reqs.extra?.sponsored === true;
  console.log('[CLIENT] Sponsored (gasless):', sponsored);

  if (!network) throw new Error('Network not specified');
  validateCAIP2Network(network);

  const chainId = getAptosChainId(network);
  if (!chainId) throw new Error(`Invalid network: ${network}`);
  if (!recipient || !amount) throw new Error('Invalid payment requirements');

  const aptos = getAptos(chainId);
  const signer = account || getAccount(privateKey!);

  console.log('[CLIENT] Signer address:', signer.accountAddress.toString().substring(0, 20) + '...');

  // Build transaction
  console.log('[CLIENT] 🔨 Building transaction...');
  console.log('[CLIENT]   Function: 0x1::primary_fungible_store::transfer');
  console.log('[CLIENT]   Asset:', asset);
  console.log('[CLIENT]   Recipient:', recipient);
  console.log('[CLIENT]   Amount:', amount);
  console.log('[CLIENT]   WithFeePayer:', sponsored);

  let transaction;
  try {
    transaction = await buildTransaction(aptos, signer, recipient, BigInt(amount), asset, sponsored);
    console.log('[CLIENT] ✅ Transaction built');
  } catch (error: any) {
    console.error('[CLIENT] ❌ Failed to build transaction:', error.message);
    console.log('='.repeat(60) + '\n');
    throw new Error(`Failed to build transaction: ${error.message}`);
  }

  // Sign transaction
  console.log('[CLIENT] ✍️ Signing transaction...');
  const signature = aptos.transaction.sign({ signer, transaction });
  console.log('[CLIENT] ✅ Transaction signed');

  // Serialize for header
  const serialized = serializeTransaction(transaction, signature);
  console.log('[CLIENT] ✅ Serialized (base64 length):', serialized.length);

  // Build payment payload
  const payload: PaymentPayload = {
    x402Version: X402_VERSION,
    resource: { url, mimeType: 'application/json' },
    accepted: reqs,
    payload: { transaction: serialized },
  };

  console.log('[CLIENT] 📤 Retrying with PAYMENT-SIGNATURE header...');

  const response = await fetch(url, {
    ...requestInit,
    headers: {
      ...(requestInit.headers as Record<string, string>),
      [PAYMENT_HEADER]: JSON.stringify(payload),
    },
  });

  console.log('[CLIENT] 📥 Response status:', response.status);

  const data = await parseResponse(response);
  const paymentHeader = response.headers.get(PAYMENT_RESPONSE_HEADER.toLowerCase()) ||
    response.headers.get(PAYMENT_RESPONSE_HEADER);
  const paymentResponse = paymentHeader ? decodePaymentResponse(paymentHeader) : null;

  if (paymentResponse) {
    console.log('[CLIENT] Payment response:', {
      success: paymentResponse.success,
      transaction: paymentResponse.transaction?.substring(0, 20) + '...',
      network: paymentResponse.network,
      payer: paymentResponse.payer?.substring(0, 20) + '...',
    });
  }

  if (response.status === 200 && paymentResponse?.transaction) {
    console.log('[CLIENT] ✅ PAYMENT SUCCESSFUL!');
    console.log('[CLIENT] Transaction hash:', paymentResponse.transaction);
  } else {
    console.log('[CLIENT] ⚠️ Response:', response.status, data);
  }

  console.log('='.repeat(60) + '\n');

  return {
    data,
    status: response.status,
    headers: headersToObject(response.headers),
    paymentInfo: paymentResponse?.transaction ? {
      transactionHash: paymentResponse.transaction,
      amount,
      recipient,
      network: paymentResponse.network || network,
      payer: paymentResponse.payer || signer.accountAddress.toString(),
    } : undefined,
  };
}

// ============================================
// MAIN EXPORT
// ============================================

export const x402axios = {
  get: <T = any>(url: string, config?: Omit<X402RequestConfig, 'method' | 'body'>) =>
    request<T>(url, { ...config, method: 'GET' }),

  post: <T = any>(url: string, body?: any, config?: Omit<X402RequestConfig, 'method' | 'body'>) =>
    request<T>(url, { ...config, method: 'POST', body }),

  put: <T = any>(url: string, body?: any, config?: Omit<X402RequestConfig, 'method' | 'body'>) =>
    request<T>(url, { ...config, method: 'PUT', body }),

  patch: <T = any>(url: string, body?: any, config?: Omit<X402RequestConfig, 'method' | 'body'>) =>
    request<T>(url, { ...config, method: 'PATCH', body }),

  delete: <T = any>(url: string, config?: Omit<X402RequestConfig, 'method' | 'body'>) =>
    request<T>(url, { ...config, method: 'DELETE' }),

  request,
};
