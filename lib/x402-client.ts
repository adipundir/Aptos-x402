/**
 * x402 Client for Aptos
 * 
 * Simple client that automatically handles x402 payment flow:
 * 1. Make request to protected resource
 * 2. If 402, create and sign payment transaction
 * 3. Retry with X-PAYMENT header
 * 4. Return response
 */

import {
  Account,
  Aptos,
  AptosConfig,
  Network,
  Ed25519PrivateKey,
} from "@aptos-labs/ts-sdk";

export interface X402ClientConfig {
  privateKey: string;
  network?: Network;
  nodeUrl?: string;
}

export interface X402Response {
  status: number;
  data: any;
  headers: Record<string, string>;
  paymentDetails?: {
    transactionHash: string;
    amount: string;
    recipient: string;
    settled: boolean;
  };
}

/**
 * Create an x402 client for Aptos
 */
export function createX402Client(config: X402ClientConfig) {
  const network = config.network || Network.TESTNET;
  const aptosConfig = config.nodeUrl
    ? new AptosConfig({ network, fullnode: config.nodeUrl })
    : new AptosConfig({ network });
  
  const aptos = new Aptos(aptosConfig);
  
  // Create account from private key
  const privateKey = new Ed25519PrivateKey(config.privateKey);
  const account = Account.fromPrivateKey({ privateKey });

  console.log(`[x402 Client] Initialized for address: ${account.accountAddress.toString()}`);

  /**
   * Make a request to an x402-protected endpoint
   * Automatically handles 402 Payment Required and retries with payment
   */
  async function request(
    url: string,
    options: RequestInit = {}
  ): Promise<X402Response> {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[x402 Client] Starting x402 payment flow`);
    console.log(`[x402 Client] URL: ${url}`);
    console.log(`[x402 Client] Method: ${options.method || "GET"}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Step 1: Make initial request (without payment)
    console.log(`[x402 Client] Step 1: Making initial request...`);
    const initialResponse = await fetch(url, options);
    const initialHeaders = Object.fromEntries(initialResponse.headers.entries());

    console.log(`[x402 Client] Initial response status: ${initialResponse.status}`);

    // If not 402, return immediately (resource is not payment-protected)
    if (initialResponse.status !== 402) {
      console.log(`[x402 Client] ✅ No payment required, returning response`);
      const data = await initialResponse.json().catch(() => ({}));
      return {
        status: initialResponse.status,
        data,
        headers: initialHeaders,
      };
    }

    console.log(`\n[x402 Client] 💳 Step 2: Received 402 Payment Required`);

    // Step 2: Parse payment requirements from 402 response body
    const paymentRequirements = await initialResponse.json();
    console.log(`[x402 Client] Payment requirements:`, JSON.stringify(paymentRequirements, null, 2));
    
    if (!paymentRequirements.accepts || paymentRequirements.accepts.length === 0) {
      throw new Error("Invalid 402 response: missing payment requirements");
    }
    
    const firstAccept = paymentRequirements.accepts[0];
    if (!firstAccept.maxAmountRequired || !firstAccept.payTo) {
      throw new Error("Invalid 402 response: missing payment requirements");
    }

    console.log(`\n[x402 Client] 🔨 Step 3: Creating payment transaction`);
    console.log(`[x402 Client] Building Aptos transfer transaction...`);
    console.log(`[x402 Client]   Function: 0x1::aptos_account::transfer`);
    console.log(`[x402 Client]   Recipient: ${firstAccept.payTo}`);
    console.log(`[x402 Client]   Amount: ${firstAccept.maxAmountRequired} Octas`);
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: "0x1::aptos_account::transfer",
        functionArguments: [
          firstAccept.payTo,
          firstAccept.maxAmountRequired,
        ],
      },
    });

    console.log(`[x402 Client] ✅ Transaction built successfully\n`);

    // Step 4: Sign transaction (but don't submit - facilitator will submit it)
    console.log(`[x402 Client] ✍️  Step 4: Signing transaction`);
    console.log(`[x402 Client] Using account: ${account.accountAddress.toString()}`);
    console.log(`[x402 Client] Signing with Ed25519 private key...`);
    const signedTx = aptos.transaction.sign({ 
      signer: account, 
      transaction 
    });

    console.log(`[x402 Client] ✅ Transaction signed successfully\n`);

    // Step 5: Serialize using BCS (Binary Canonical Serialization)
    // This is the Aptos standard for transaction serialization
    console.log(`[x402 Client] 📦 Step 5: Serializing transaction (BCS)`);
    console.log(`[x402 Client] Using Binary Canonical Serialization (Aptos standard)...`);
    const signedTxBytes = signedTx.bcsToBytes();
    
    console.log(`[x402 Client] ✅ Serialized to ${signedTxBytes.length} bytes\n`);

    // Step 6: Create PaymentPayload structure (per x402 spec for Aptos)
    console.log(`[x402 Client] 🔐 Step 6: Creating PaymentPayload`);
    console.log(`[x402 Client] For Aptos, we send the complete signed transaction...`);
    
    // The signedTx is a SimpleTransaction that contains everything needed
    // The facilitator will deserialize it and submit to blockchain
    // We encode the entire SimpleTransaction as a single payload
    
    // Create PaymentPayload per x402 spec
    // For Aptos, we use the complete signed transaction in both fields
    // The facilitator knows how to extract transaction and authenticator from it
    const paymentPayload = {
      x402Version: 1,
      scheme: firstAccept.scheme,
      network: firstAccept.network,
      payload: {
        // Both contain the complete signed transaction
        // The facilitator will deserialize it properly
        signature: Buffer.from(signedTxBytes).toString('base64'),
        transaction: Buffer.from(signedTxBytes).toString('base64'),
      }
    };
    
    // Base64 encode the entire payload for HTTP transport
    const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
    
    console.log(`[x402 Client] ✅ Created PaymentPayload structure`);
    console.log(`[x402 Client] ✅ Encoded to ${paymentHeader.length} characters`);
    console.log(`[x402 Client] Preview: ${paymentHeader.substring(0, 80)}...`);
    console.log(`[x402 Client] This will be sent in X-PAYMENT header\n`);

    // Step 7: Retry request with X-PAYMENT header (per x402 spec)
    console.log(`[x402 Client] 🔄 Step 7: Retrying request with payment`);
    const requestHeaders = {
      ...options.headers,
      "X-PAYMENT": paymentHeader,
    };

    console.log(`[x402 Client] Headers being sent:`);
    console.log(`[x402 Client]   X-PAYMENT: ${paymentHeader.substring(0, 50)}... (${paymentHeader.length} chars)`);
    console.log(`[x402 Client] Making request to: ${url}\n`);

    const paidResponse = await fetch(url, {
      ...options,
      headers: requestHeaders,
    });

    console.log(`[x402 Client] ✅ Response received: ${paidResponse.status} ${paidResponse.statusText}\n`);

    const paidHeaders = Object.fromEntries(paidResponse.headers.entries());
    const data = await paidResponse.json().catch(() => ({}));

    // Step 8: Parse X-Payment-Response header (per x402 spec)
    // The facilitator returns payment settlement details in this header
    console.log(`[x402 Client] 📋 Step 8: Checking payment settlement`);
    let paymentDetails;
    if (paidHeaders["x-payment-response"]) {
      console.log(`[x402 Client] Found X-Payment-Response header in response`);
      try {
        paymentDetails = JSON.parse(paidHeaders["x-payment-response"]);
        console.log(`[x402 Client] ✅ Payment settled on blockchain!`);
        console.log(`[x402 Client] Settlement details:`);
        console.log(`[x402 Client]   Transaction Hash: ${paymentDetails.transactionHash}`);
        console.log(`[x402 Client]   Amount: ${paymentDetails.amount} Octas`);
        console.log(`[x402 Client]   Recipient: ${paymentDetails.recipient}`);
        console.log(`[x402 Client]   Status: ${paymentDetails.settled ? "Confirmed" : "Pending"}`);
      } catch (error) {
        console.warn(`[x402 Client] ⚠️  Failed to parse X-Payment-Response header`);
      }
    } else {
      console.warn(`[x402 Client] ⚠️  No X-Payment-Response header found in response`);
    }

    if (!paidResponse.ok) {
      console.error(`[x402 Client] ❌ Request failed after payment`);
      throw new Error(`Request failed: ${paidResponse.status} ${paidResponse.statusText}`);
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[x402 Client] ✅ Payment flow completed successfully!`);
    console.log(`[x402 Client] ✅ Protected resource delivered`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    return {
      status: paidResponse.status,
      data,
      headers: paidHeaders,
      paymentDetails,
    };
  }

  /**
   * GET request to x402-protected endpoint
   */
  async function get(url: string, options: RequestInit = {}): Promise<X402Response> {
    return request(url, { ...options, method: "GET" });
  }

  /**
   * POST request to x402-protected endpoint
   */
  async function post(
    url: string,
    body?: any,
    options: RequestInit = {}
  ): Promise<X402Response> {
    return request(url, {
      ...options,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Get account balance
   */
  async function getBalance(): Promise<number> {
    return await aptos.getAccountAPTAmount({
      accountAddress: account.accountAddress,
    });
  }

  /**
   * Get account address
   */
  function getAddress(): string {
    return account.accountAddress.toString();
  }

  return {
    request,
    get,
    post,
    getBalance,
    getAddress,
    account,
    aptos,
  };
}

/**
 * Example usage:
 * 
 * ```typescript
 * import { createX402Client } from './lib/x402-client';
 * 
 * const client = createX402Client({
 *   privateKey: process.env.DEMO_PRIVATE_KEY!,
 *   network: Network.TESTNET,
 * });
 * 
 * // Make a request - payment is handled automatically
 * const response = await client.get('http://localhost:3000/api/protected/weather');
 * console.log(response.data);
 * console.log('Payment details:', response.paymentDetails);
 * ```
 */

