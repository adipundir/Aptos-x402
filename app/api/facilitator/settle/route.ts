import { NextRequest, NextResponse } from "next/server";
import { getAptosClient } from "@/lib/aptos-utils";
import type {
  SettleRequest,
  SettleResponse,
  PaymentPayload,
} from "@/lib/x402-protocol-types";
import { X402_VERSION, APTOS_SCHEME, APTOS_TESTNET, APTOS_MAINNET, APTOS_DEVNET } from "@/lib/x402-protocol-types";
import { SimpleTransaction, AccountAuthenticator, Deserializer } from "@aptos-labs/ts-sdk";

export const dynamic = "force-dynamic";

// ⚡ In-memory cache for recently submitted transactions
const submittedTransactions = new Map<string, { txHash: string; timestamp: number; network: string }>();
const SUBMISSION_CACHE_TTL_MS = 300000; // 5 minutes

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of submittedTransactions.entries()) {
    if (now - value.timestamp > SUBMISSION_CACHE_TTL_MS) {
      submittedTransactions.delete(key);
    }
  }
}, 60000);

/**
 * POST /api/facilitator/settle
 * ⚡ OPTIMIZED: Submits to blockchain and returns immediately (~100-200ms)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('\n💰 [Facilitator Settle] Starting settlement...');

  try {
    const body: SettleRequest = await request.json();
    const { x402Version, paymentHeader, paymentRequirements } = body;
    
    console.log('[Settle] Request details:', {
      x402Version,
      network: paymentRequirements?.network,
      amount: paymentRequirements?.maxAmountRequired,
    });

    // Fast validation
    if (x402Version !== X402_VERSION) {
      console.log('[Settle] ❌ Unsupported version');
      return NextResponse.json({ success: false, error: `Unsupported x402 version: ${x402Version}`, txHash: null, networkId: null });
    }

    if (!paymentHeader || !paymentRequirements) {
      console.log('[Settle] ❌ Missing required fields');
      return NextResponse.json({ success: false, error: "Missing required fields", txHash: null, networkId: null }, { status: 400 });
    }

    if (paymentRequirements.scheme !== APTOS_SCHEME) {
      console.log('[Settle] ❌ Unsupported scheme');
      return NextResponse.json({ success: false, error: `Unsupported scheme: ${paymentRequirements.scheme}`, txHash: null, networkId: null });
    }

    const network = paymentRequirements.network;
    if (!network) {
      console.log('[Settle] ❌ Network not specified');
      return NextResponse.json({ success: false, error: "Network not specified", txHash: null, networkId: null }, { status: 400 });
    }
    
    console.log('[Settle] ✅ Basic validation passed');
    const aptos = getAptosClient(network);

    // Parse payment payload (⚡ direct JSON, no base64)
    let paymentPayload: PaymentPayload;
    try {
      paymentPayload = JSON.parse(paymentHeader);
    } catch {
      return NextResponse.json({ success: false, error: "Invalid payment header", txHash: null, networkId: null }, { status: 400 });
    }
    
    const signatureHex = paymentPayload.payload.signature;
    const transactionHex = paymentPayload.payload.transaction;
    
    if (!signatureHex || !transactionHex) {
      return NextResponse.json({ success: false, error: "Missing signature or transaction", txHash: null, networkId: null });
    }
    
    // Check cache
    const txCacheKey = `${transactionHex}:${signatureHex}:${network}`;
    const cachedSubmission = submittedTransactions.get(txCacheKey);
    
    if (cachedSubmission && (Date.now() - cachedSubmission.timestamp) < SUBMISSION_CACHE_TTL_MS) {
      console.log('[Settle] ⚡ Cache hit! Returning cached transaction:', cachedSubmission.txHash);
      const nextResponse = NextResponse.json({
        success: true,
        error: null,
        txHash: cachedSubmission.txHash,
        networkId: cachedSubmission.network,
      });
      nextResponse.headers.set('X-Settlement-Time', (Date.now() - startTime).toString());
      nextResponse.headers.set('X-Cached', 'true');
      return nextResponse;
    }
    
    console.log('[Settle] Cache miss, proceeding with submission...');
    
    // Decode and deserialize
    let transaction: SimpleTransaction;
    let senderAuthenticator: AccountAuthenticator;
    
    try {
      console.log('[Settle] Deserializing transaction...');
      const signatureBytes = Buffer.from(signatureHex, 'hex');
      const transactionBytes = Buffer.from(transactionHex, 'hex');
      
      transaction = SimpleTransaction.deserialize(new Deserializer(transactionBytes));
      senderAuthenticator = AccountAuthenticator.deserialize(new Deserializer(signatureBytes));
      console.log('[Settle] ✅ Deserialization successful');
    } catch (err: any) {
      console.log('[Settle] ❌ Deserialization failed:', err.message);
      return NextResponse.json({ success: false, error: `Deserialization failed: ${err.message}`, txHash: null, networkId: null }, { status: 400 });
    }
    
    // Submit to blockchain
    let txHash: string;
    try {
      console.log('[Settle] Submitting transaction to blockchain...');
      const committed = await aptos.transaction.submit.simple({ transaction, senderAuthenticator });
      txHash = committed.hash;
      console.log('[Settle] ✅ Transaction submitted to mempool:', txHash);
    } catch (submitError: any) {
      console.log('[Settle] ❌ Submission failed:', submitError.message);
      return NextResponse.json({ success: false, error: submitError.message || String(submitError), txHash: null, networkId: null }, { status: 500 });
    }

    // Async confirmation (non-blocking)
    console.log('[Settle] Starting background confirmation...');
    aptos.waitForTransaction({ 
      transactionHash: txHash,
      options: { checkSuccess: true, timeoutSecs: 30 }
    }).then(() => {
      console.log('[Settle] ✅ Transaction confirmed on-chain:', txHash);
    }).catch((err) => {
      console.log('[Settle] ⚠️ Background confirmation failed:', err.message);
    });

    // Cache result
    submittedTransactions.set(txCacheKey, {
      txHash,
      timestamp: Date.now(),
      network,
    });
    console.log('[Settle] Transaction cached');

    const settlementTime = Date.now() - startTime;
    console.log(`[Settle] ✅ Settlement complete! Took ${settlementTime}ms`);
    
    const nextResponse = NextResponse.json({ success: true, error: null, txHash, networkId: network });
    nextResponse.headers.set('X-Settlement-Time', settlementTime.toString());
    return nextResponse;

  } catch (error: any) {
    if (error.message?.includes("SEQUENCE_NUMBER_TOO_OLD") || 
        error.message?.includes("INVALID_SEQ_NUMBER") ||
        error.message?.includes("already submitted")) {
      return NextResponse.json({ success: false, error: "Transaction already used", txHash: null, networkId: null }, { status: 409 });
    }
    
    return NextResponse.json({ success: false, error: error.message || String(error), txHash: null, networkId: null }, { status: 500 });
  }
}
