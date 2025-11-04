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

/**
 * POST /api/facilitator/settle
 * 
 * x402 Facilitator Settle Endpoint (per official spec):
 * - Receives payment header and payment requirements from protected API AFTER verification
 * - Submits transaction to blockchain
 * - Waits for confirmation
 * - Returns settlement result (success, txHash, networkId)
 * 
 * This is slow and expensive - actual blockchain submission
 * Only call this AFTER the work/resource has been verified
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`[Facilitator Settle] POST /api/facilitator/settle`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    const body: SettleRequest = await request.json();
    const { x402Version, paymentHeader, paymentRequirements } = body;

    console.log(`[Facilitator Settle] Request body:`, {
      x402Version,
      hasPaymentHeader: !!paymentHeader,
      headerLength: paymentHeader?.length,
      scheme: paymentRequirements.scheme,
      network: paymentRequirements.network,
    });

    // Validate x402 version
    if (x402Version !== X402_VERSION) {
      console.error(`[Facilitator Settle] ❌ Unsupported x402 version: ${x402Version}`);
      const response: SettleResponse = {
        success: false,
        error: `Unsupported x402 version: ${x402Version}`,
        txHash: null,
        networkId: null,
      };
      return NextResponse.json(response);
    }

    // Validate required fields
    if (!paymentHeader || !paymentRequirements) {
      console.error(`[Facilitator Settle] ❌ Missing required fields`);
      const response: SettleResponse = {
        success: false,
        error: "Missing paymentHeader or paymentRequirements",
        txHash: null,
        networkId: null,
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate scheme
    if (paymentRequirements.scheme !== APTOS_SCHEME) {
      console.error(`[Facilitator Settle] ❌ Unsupported scheme: ${paymentRequirements.scheme}`);
      const response: SettleResponse = {
        success: false,
        error: `Unsupported scheme: ${paymentRequirements.scheme}`,
        txHash: null,
        networkId: null,
      };
      return NextResponse.json(response);
    }

    const network = paymentRequirements.network;
    if (!network) {
      console.error(`[Facilitator Settle] ❌ Network not specified in payment requirements`);
      const response: SettleResponse = {
        success: false,
        error: "Network not specified in payment requirements",
        txHash: null,
        networkId: null,
      };
      return NextResponse.json(response, { status: 400 });
    }
    console.log(`[Facilitator Settle] Network: ${network}`);
    
    const aptos = getAptosClient(network);
    console.log(`[Facilitator Settle] ✅ Aptos client initialized`);

    // Parse the payment header (base64 encoded PaymentPayload)
    console.log(`[Facilitator Settle] 📥 Parsing payment payload...`);
    console.log(`[Facilitator Settle] Raw paymentHeader (first 100 chars):`, paymentHeader.substring(0, 100) + '...');
    
    let paymentPayloadJson: string;
    try {
      paymentPayloadJson = Buffer.from(paymentHeader, 'base64').toString('utf-8');
      console.log(`[Facilitator Settle] 📝 Decoded JSON (first 300 chars):`, paymentPayloadJson.substring(0, 300) + '...');
    } catch (decodeError) {
      console.error(`[Facilitator Settle] ❌ Failed to decode base64:`, decodeError);
      const response: SettleResponse = {
        success: false,
        error: "Invalid base64 encoding",
        txHash: null,
        networkId: null,
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    let paymentPayload: PaymentPayload;
    try {
      paymentPayload = JSON.parse(paymentPayloadJson);
      console.log(`[Facilitator Settle] ✅ Parsed JSON successfully`);
    } catch (parseError) {
      console.error(`[Facilitator Settle] ❌ Failed to parse JSON:`, parseError);
      const response: SettleResponse = {
        success: false,
        error: "Invalid JSON",
        txHash: null,
        networkId: null,
      };
      return NextResponse.json(response, { status: 400 });
    }
    
    console.log(`[Facilitator Settle] ✅ Parsed payment payload`);
    console.log(`[Facilitator Settle] Scheme: ${paymentPayload.scheme}`);
    console.log(`[Facilitator Settle] Network: ${paymentPayload.network}`);
    console.log(`[Facilitator Settle] Payload keys:`, Object.keys(paymentPayload.payload));

    // Extract signature and transaction separately (like Sui)
    console.log(`\n🔍 [Facilitator Settle] Extracting signature and transaction...`);
    const signatureBase64 = paymentPayload.payload.signature;
    const transactionBase64 = paymentPayload.payload.transaction;
    
    if (!signatureBase64 || !transactionBase64) {
      console.error(`[Facilitator Settle] ❌ Missing signature or transaction`);
      console.error(`[Facilitator Settle] Signature:`, signatureBase64 ? 'present' : 'MISSING');
      console.error(`[Facilitator Settle] Transaction:`, transactionBase64 ? 'present' : 'MISSING');
      const response: SettleResponse = {
        success: false,
        error: "Invalid payload: missing signature or transaction",
        txHash: null,
        networkId: null,
      };
      return NextResponse.json(response);
    }

    console.log(`[Facilitator Settle] ✅ Signature base64 length: ${signatureBase64.length}`);
    console.log(`[Facilitator Settle] ✅ Transaction base64 length: ${transactionBase64.length}`);
    console.log(`[Facilitator Settle] Signature (first 50):`, signatureBase64.substring(0, 50) + '...');
    console.log(`[Facilitator Settle] Transaction (first 50):`, transactionBase64.substring(0, 50) + '...');
    
    console.log(`\n📤 [Facilitator Settle] Submitting signed transaction to blockchain...`);
    
    // Decode the BCS bytes
    let signatureBytes: Buffer;
    let transactionBytes: Buffer;
    try {
      signatureBytes = Buffer.from(signatureBase64, 'base64');
      transactionBytes = Buffer.from(transactionBase64, 'base64');
      
      console.log(`[Facilitator Settle] ✅ Signature decoded: ${signatureBytes.length} BCS bytes`);
      console.log(`[Facilitator Settle] ✅ Transaction decoded: ${transactionBytes.length} BCS bytes`);
      console.log(`[Facilitator Settle] Signature bytes (first 20):`, Array.from(signatureBytes.slice(0, 20)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
      console.log(`[Facilitator Settle] Transaction bytes (first 20):`, Array.from(transactionBytes.slice(0, 20)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
    } catch (decodeError) {
      console.error(`[Facilitator Settle] ❌ Failed to decode base64:`, decodeError);
      const response: SettleResponse = {
        success: false,
        error: "Invalid base64 encoding",
        txHash: null,
        networkId: null,
      };
      return NextResponse.json(response);
    }
    
    // Deserialize BCS bytes back into SDK objects (per official Aptos SDK docs)
    console.log(`\n🔄 [Facilitator Settle] Deserializing BCS back to SDK objects...`);
    let transaction: SimpleTransaction;
    let senderAuthenticator: AccountAuthenticator;
    
    try {
      // Deserialize the RawTransaction from BCS
      const txDeserializer = new Deserializer(transactionBytes);
      transaction = SimpleTransaction.deserialize(txDeserializer);
      console.log(`[Facilitator Settle] ✅ Deserialized transaction object`);
      
      // Deserialize the AccountAuthenticator from BCS
      const authDeserializer = new Deserializer(signatureBytes);
      senderAuthenticator = AccountAuthenticator.deserialize(authDeserializer);
      console.log(`[Facilitator Settle] ✅ Deserialized authenticator object`);
    } catch (deserializeError: any) {
      console.error(`[Facilitator Settle] ❌ Failed to deserialize BCS:`, deserializeError);
      const settleResponse: SettleResponse = {
        success: false,
        error: `BCS deserialization failed: ${deserializeError.message}`,
        txHash: null,
        networkId: null,
      };
      return NextResponse.json(settleResponse, { status: 400 });
    }
    
    // Validate transaction before submission
    console.log(`\n🔍 [Facilitator Settle] Validating transaction before submission...`);
    
    try {
      // Extract sender address from transaction (SimpleTransaction is a RawTransaction wrapper)
      const txAny = transaction as any;
      const senderAddress = txAny.sender?.toString() || txAny.rawTransaction?.sender?.toString();
      
      if (!senderAddress) {
        console.warn(`[Facilitator Settle] ⚠️  Could not extract sender address, skipping balance check`);
      } else {
        console.log(`[Facilitator Settle] Sender address: ${senderAddress}`);
        
        // Check sender balance before submission
        const senderBalance = await aptos.getAccountAPTAmount({
          accountAddress: senderAddress,
        });
        
        console.log(`[Facilitator Settle] Sender balance: ${senderBalance} Octas (${senderBalance / 100_000_000} APT)`);
        
        // Extract amount from transaction (for transfer transactions)
        let requiredAmount = BigInt(0);
        const payload = txAny.payload || txAny.rawTransaction?.payload;
        if (payload && typeof payload === 'object') {
          if (payload.function === '0x1::aptos_account::transfer' && payload.arguments) {
            // Second argument is the amount
            if (payload.arguments[1]) {
              requiredAmount = BigInt(payload.arguments[1]);
              console.log(`[Facilitator Settle] Required amount: ${requiredAmount} Octas (${Number(requiredAmount) / 100_000_000} APT)`);
            }
          }
        }
      
        // Estimate transaction fee (typically ~100-200 Octas, but we'll use a conservative estimate)
        const estimatedFee = BigInt(1000); // 0.00001 APT conservative estimate
        const totalRequired = requiredAmount + estimatedFee;
        
        console.log(`[Facilitator Settle] Total required (amount + fee): ${totalRequired} Octas (${Number(totalRequired) / 100_000_000} APT)`);
        
        if (BigInt(senderBalance) < totalRequired) {
          const missingAmount = totalRequired - BigInt(senderBalance);
          console.error(`[Facilitator Settle] ❌ Insufficient balance!`);
          console.error(`[Facilitator Settle] Available: ${senderBalance} Octas (${senderBalance / 100_000_000} APT)`);
          console.error(`[Facilitator Settle] Required: ${totalRequired} Octas (${Number(totalRequired) / 100_000_000} APT)`);
          console.error(`[Facilitator Settle] Missing: ${missingAmount} Octas (${Number(missingAmount) / 100_000_000} APT)`);
          
          const settleResponse: SettleResponse = {
            success: false,
            error: `INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE: Available ${senderBalance / 100_000_000} APT, Required ${Number(totalRequired) / 100_000_000} APT`,
            txHash: null,
            networkId: null,
          };
          return NextResponse.json(settleResponse, { status: 400 });
        }
        
        console.log(`[Facilitator Settle] ✅ Balance check passed`);
      }
    } catch (validationError: any) {
      console.error(`[Facilitator Settle] ❌ Validation error:`, validationError);
      // Don't fail on validation errors, just log them and proceed
      // The blockchain will reject invalid transactions anyway
      console.log(`[Facilitator Settle] ⚠️  Continuing with submission despite validation warning`);
    }
    
    // Submit using SDK's proper method (Pattern A from official Aptos SDK docs)
    console.log(`\n📤 [Facilitator Settle] Submitting via SDK submit.simple()...`);
    
    let pendingTx;
    try {
      const committed = await aptos.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });
      
      pendingTx = { hash: committed.hash };
      console.log(`[Facilitator Settle] ✅ Transaction submitted!`);
      console.log(`[Facilitator Settle] Transaction hash: ${pendingTx.hash}`);
    } catch (submitError: any) {
      console.error(`[Facilitator Settle] ❌ Submission failed:`, submitError);
      
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

    console.log(`\n⏳ [Facilitator Settle] Waiting for blockchain confirmation...`);
    
    // Wait for transaction to be confirmed (per x402 spec)
    await aptos.waitForTransaction({ 
      transactionHash: pendingTx.hash 
    });

    console.log(`[Facilitator Settle] ✅ Transaction confirmed!`);

    // Check if transaction succeeded
    console.log(`[Facilitator Settle] Fetching transaction details...`);
    const txDetails = await aptos.transaction.getTransactionByHash({
      transactionHash: pendingTx.hash,
    });

    console.log(`[Facilitator Settle] Transaction details:`, {
      hasSuccess: 'success' in txDetails,
      success: 'success' in txDetails ? txDetails.success : 'N/A',
      type: txDetails.type,
    });

    if (!('success' in txDetails) || !txDetails.success) {
      console.error(`[Facilitator Settle] ❌ Transaction FAILED on blockchain`);
      const settleResponse: SettleResponse = {
        success: false,
        error: "Transaction failed on blockchain",
        txHash: pendingTx.hash,
        networkId: network,
      };
      return NextResponse.json(settleResponse);
    }

    console.log(`\n✅ [Facilitator Settle] Payment settled successfully!`);
    console.log(`[Facilitator Settle] Transaction hash: ${pendingTx.hash}`);

    const duration = Date.now() - startTime;
    console.log(`[Facilitator Settle] ⏱️  Settlement took ${duration}ms`);

    const settleResponse: SettleResponse = {
      success: true,
      error: null,
      txHash: pendingTx.hash,
      networkId: network,
    };

    console.log(`[Facilitator Settle] Response:`, settleResponse);
    const nextResponse = NextResponse.json(settleResponse);
    nextResponse.headers.set('X-Settlement-Time', duration.toString());
    return nextResponse;

  } catch (error: any) {
    console.error(`\n❌ [Facilitator Settle] ERROR during settlement`);
    console.error(`[Facilitator Settle] Error type:`, error.constructor.name);
    console.error(`[Facilitator Settle] Error message:`, error.message);
    console.error(`[Facilitator Settle] Full error:`, error);
    
    // Check if it's a duplicate transaction error
    if (error.message?.includes("SEQUENCE_NUMBER_TOO_OLD") || 
        error.message?.includes("INVALID_SEQ_NUMBER") ||
        error.message?.includes("already submitted")) {
      const response: SettleResponse = {
        success: false,
        error: "Transaction already used",
        txHash: null,
        networkId: null,
      };
      return NextResponse.json(response, { status: 409 });
    }

    const response: SettleResponse = {
      success: false,
      error: error.message || String(error),
      txHash: null,
      networkId: null,
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}
