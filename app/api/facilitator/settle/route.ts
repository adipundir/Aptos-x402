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
    
    // Validate transaction before submission (enhancement from composer)
    console.log('[Settle] Validating transaction before submission...');
    
    try {
      // Extract sender address from transaction (SimpleTransaction is a RawTransaction wrapper)
      const txAny = transaction as any;
      const senderAddress = txAny.sender?.toString() || txAny.rawTransaction?.sender?.toString();
      
      if (!senderAddress) {
        console.warn('[Settle] ⚠️  Could not extract sender address, skipping balance check');
      } else {
        console.log('[Settle] Sender address:', senderAddress);
        
        // Check sender balance before submission
        const senderBalance = await aptos.getAccountAPTAmount({
          accountAddress: senderAddress,
        });
        
        console.log('[Settle] Sender balance:', `${senderBalance} Octas (${senderBalance / 100_000_000} APT)`);
        
        // Extract amount from transaction (for transfer transactions)
        let requiredAmount = BigInt(0);
        const payload = txAny.payload || txAny.rawTransaction?.payload;
        if (payload && typeof payload === 'object') {
          if (payload.function === '0x1::aptos_account::transfer' && payload.arguments) {
            // Second argument is the amount
            if (payload.arguments[1]) {
              requiredAmount = BigInt(payload.arguments[1]);
              console.log('[Settle] Required amount:', `${requiredAmount} Octas (${Number(requiredAmount) / 100_000_000} APT)`);
            }
          }
        }
      
        // Estimate transaction fee (typically ~100-200 Octas, but we'll use a conservative estimate)
        const estimatedFee = BigInt(1000); // 0.00001 APT conservative estimate
        const totalRequired = requiredAmount + estimatedFee;
        
        console.log('[Settle] Total required (amount + fee):', `${totalRequired} Octas (${Number(totalRequired) / 100_000_000} APT)`);
        
        if (BigInt(senderBalance) < totalRequired) {
          const missingAmount = totalRequired - BigInt(senderBalance);
          console.error('[Settle] ❌ Insufficient balance!');
          console.error('[Settle] Available:', `${senderBalance} Octas (${senderBalance / 100_000_000} APT)`);
          console.error('[Settle] Required:', `${totalRequired} Octas (${Number(totalRequired) / 100_000_000} APT)`);
          console.error('[Settle] Missing:', `${missingAmount} Octas (${Number(missingAmount) / 100_000_000} APT)`);
          
          const settleResponse: SettleResponse = {
            success: false,
            error: `INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE: Available ${senderBalance / 100_000_000} APT, Required ${Number(totalRequired) / 100_000_000} APT`,
            txHash: null,
            networkId: null,
          };
          return NextResponse.json(settleResponse, { status: 400 });
        }
        
        console.log('[Settle] ✅ Balance check passed');
      }
    } catch (validationError: any) {
      console.error('[Settle] ❌ Validation error:', validationError);
      // Don't fail on validation errors, just log them and proceed
      // The blockchain will reject invalid transactions anyway
      console.log('[Settle] ⚠️  Continuing with submission despite validation warning');
    }
    
    // Submit to blockchain
    let txHash: string;
    try {
      console.log('[Settle] Submitting transaction to blockchain...');
      const committed = await aptos.transaction.submit.simple({ transaction, senderAuthenticator });
      txHash = committed.hash;
      console.log('[Settle] ✅ Transaction submitted to mempool:', txHash);
    } catch (submitError: any) {
      console.error('[Settle] ❌ Submission failed:', submitError);
      
      // Extract meaningful error message
      let errorMessage = submitError.message || String(submitError);
      
      // Check for common error patterns
      if (errorMessage.includes('INSUFFICIENT_BALANCE') || errorMessage.includes('insufficient')) {
        errorMessage = `INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE: ${errorMessage}`;
      } else if (errorMessage.includes('SEQUENCE_NUMBER')) {
        errorMessage = `SEQUENCE_NUMBER_MISMATCH: ${errorMessage}`;
      } else if (errorMessage.includes('invalid') || errorMessage.includes('Invalid')) {
        errorMessage = `INVALID_TRANSACTION: ${errorMessage}`;
      }
      
      const settleResponse: SettleResponse = {
        success: false,
        error: errorMessage,
        txHash: null,
        networkId: null,
      };
      return NextResponse.json(settleResponse, { status: 500 });
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
