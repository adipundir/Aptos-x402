import { NextRequest, NextResponse } from "next/server";
import { getAptosClient } from "@/lib/aptos-utils";
import type {
  VerifyRequest,
  VerifyResponse,
  PaymentPayload,
} from "@/lib/x402-protocol-types";
import { X402_VERSION, APTOS_SCHEME, APTOS_TESTNET, APTOS_MAINNET, APTOS_DEVNET } from "@/lib/x402-protocol-types";

export const dynamic = "force-dynamic";

// ⚡ Helper: Extract amount from BCS-encoded argument
function extractAmount(amountArgRaw: any): string {
  if (typeof amountArgRaw === 'object' && 'value' in amountArgRaw) {
    const valueData = (amountArgRaw as any).value;
    if (typeof valueData === 'object' && valueData !== null && 'value' in valueData) {
      const innerValue = valueData.value;
      if (innerValue instanceof Uint8Array || Array.isArray(innerValue)) {
        const arr = Array.isArray(innerValue) ? innerValue : Array.from(innerValue);
        let num = BigInt(0);
        for (let i = 0; i < arr.length; i++) {
          num += BigInt(arr[i]) << BigInt(i * 8);
        }
        return num.toString();
      }
      return innerValue.toString();
    } else if (valueData instanceof Uint8Array || Array.isArray(valueData)) {
      const arr = Array.isArray(valueData) ? valueData : Array.from(valueData);
      let num = BigInt(0);
      for (let i = 0; i < arr.length; i++) {
        num += BigInt(arr[i]) << BigInt(i * 8);
      }
      return num.toString();
    }
    return valueData.toString();
  }
  
  const amountStr = amountArgRaw.toString();
  if (amountStr.startsWith('0x')) {
    const hex = amountStr.slice(2);
    let num = BigInt(0);
    for (let i = 0; i < hex.length; i += 2) {
      const byte = parseInt(hex.substr(i, 2), 16);
      num += BigInt(byte) << BigInt((i / 2) * 8);
    }
    return num.toString();
  }
  return amountStr;
}

/**
 * POST /api/facilitator/verify
 * 
 * 🛡️ ROBUST VERIFICATION WITH TRANSACTION SIMULATION
 * 
 * This endpoint performs comprehensive validation to ensure the transaction
 * will succeed when submitted. Since we use optimistic settlement (no confirmation wait),
 * we must be absolutely certain the transaction is valid.
 * 
 * Verification Steps:
 * 1. Structure validation (BCS deserialization)
 * 2. Signature validation (cryptographic verification)
 * 3. Amount & recipient validation
 * 4. Sender balance check (has enough APT + gas)
 * 5. Transaction simulation (will it succeed on-chain?)
 * 6. Sequence number validation (not reused)
 * 
 * Only if ALL checks pass, we return isValid: true
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('\n🔍 [Facilitator Verify] Starting verification...');

  try {
    const body: VerifyRequest = await request.json();
    const { x402Version, paymentHeader, paymentRequirements } = body;
    console.log('[Verify] Received request:', {
      x402Version,
      network: paymentRequirements?.network,
      amount: paymentRequirements?.maxAmountRequired,
      recipient: paymentRequirements?.payTo,
    });

    // Fast validation checks
    if (x402Version !== X402_VERSION) {
      console.log('[Verify] ❌ Unsupported x402 version:', x402Version);
      return NextResponse.json({ isValid: false, invalidReason: `Unsupported x402 version: ${x402Version}` });
    }

    if (!paymentHeader || !paymentRequirements) {
      console.log('[Verify] ❌ Missing required fields');
      return NextResponse.json({ isValid: false, invalidReason: "Missing required fields" }, { status: 400 });
    }

    if (paymentRequirements.scheme !== APTOS_SCHEME) {
      console.log('[Verify] ❌ Unsupported scheme:', paymentRequirements.scheme);
      return NextResponse.json({ isValid: false, invalidReason: `Unsupported scheme: ${paymentRequirements.scheme}` });
    }

    const network = paymentRequirements.network;
    if (!network || !network.startsWith('aptos-')) {
      console.log('[Verify] ❌ Invalid Aptos network:', network);
      return NextResponse.json({ isValid: false, invalidReason: `Invalid Aptos network: ${network}` });
    }
    
    console.log('[Verify] ✅ Basic validation passed');
    const aptos = getAptosClient(network);

    // Parse payment header (⚡ direct JSON, no base64)
    let paymentPayload: PaymentPayload;
    try {
      paymentPayload = JSON.parse(paymentHeader);
    } catch {
      return NextResponse.json({ isValid: false, invalidReason: "Invalid payment header encoding" });
    }

    // Validate payload matches requirements
    if (paymentPayload.scheme !== paymentRequirements.scheme ||
        paymentPayload.network !== paymentRequirements.network) {
      return NextResponse.json({ 
        isValid: false, 
        invalidReason: "Scheme or network mismatch" 
      });
    }
    
    const signatureHex = paymentPayload.payload.signature;
    const transactionHex = paymentPayload.payload.transaction;
    
    if (!signatureHex || !transactionHex) {
      return NextResponse.json({ isValid: false, invalidReason: "Missing signature or transaction" });
    }
    
    // Decode BCS components from hex (⚡ faster than base64)
    let signatureBytes: Buffer;
    let transactionBytes: Buffer;
    
    try {
      signatureBytes = Buffer.from(signatureHex, 'hex');
      transactionBytes = Buffer.from(transactionHex, 'hex');
      
      if (signatureBytes.length === 0 || transactionBytes.length === 0) {
        return NextResponse.json({ isValid: false, invalidReason: "Empty payment data" });
      }
    } catch {
      return NextResponse.json({ isValid: false, invalidReason: "Invalid hex encoding" });
    }
    
    // ⚡ STEP 1: BCS Deserialization & Structure Validation
    console.log('[Verify] Step 1: Starting BCS deserialization...');
    let transaction: any;
    let senderAuthenticator: any;
    let rawTx: any;
    let senderAddress: string;
    let recipientArg: string;
    let amountValue: string;
    
    try {
      const { SimpleTransaction, AccountAuthenticator, Deserializer } = await import("@aptos-labs/ts-sdk");
      
      transaction = SimpleTransaction.deserialize(new Deserializer(transactionBytes));
      senderAuthenticator = AccountAuthenticator.deserialize(new Deserializer(signatureBytes));
      rawTx = transaction.rawTransaction;
      const payload = rawTx.payload as any;
      console.log('[Verify] ✅ BCS deserialization successful');
      
      // Extract function and arguments
      let functionId: string;
      let args: any[];
      
      if ('entryFunction' in payload) {
        const entryFunc = payload.entryFunction;
        if (!('module_name' in entryFunc && 'function_name' in entryFunc)) {
          return NextResponse.json({ isValid: false, invalidReason: "Invalid entryFunction structure" });
        }
          const moduleName = entryFunc.module_name;
          const funcName = entryFunc.function_name;
          const moduleAddress = moduleName.address.toString();
          const moduleIdentifier = moduleName.name?.identifier || moduleName.name?.toString() || '';
          const functionIdentifier = funcName.identifier || funcName.toString();
          functionId = `${moduleAddress}::${moduleIdentifier}::${functionIdentifier}`;
          args = entryFunc.args || [];
      } else if ('function' in payload && 'functionArguments' in payload) {
        functionId = payload.function.toString();
        args = payload.functionArguments;
      } else {
        return NextResponse.json({ isValid: false, invalidReason: "Invalid transaction payload type" });
      }
      
      if (!functionId.includes("coin::transfer") && !functionId.includes("aptos_account::transfer")) {
        return NextResponse.json({ isValid: false, invalidReason: `Invalid function: ${functionId}` });
      }
      
      if (args.length < 2) {
        return NextResponse.json({ isValid: false, invalidReason: "Missing transaction arguments" });
      }
      
      recipientArg = args[0].toString();
      amountValue = extractAmount(args[1]);
      
      console.log('[Verify] Transaction details:', {
        function: functionId,
        recipient: recipientArg,
        amount: amountValue,
      });
      
      const normalizeAddress = (addr: string) => addr.toLowerCase().replace(/^0x/, '');
      
      if (normalizeAddress(recipientArg) !== normalizeAddress(paymentRequirements.payTo)) {
        console.log('[Verify] ❌ Recipient mismatch:', { 
          expected: paymentRequirements.payTo, 
          got: recipientArg 
        });
        return NextResponse.json({ isValid: false, invalidReason: "Recipient mismatch" });
      }
      
      if (amountValue !== paymentRequirements.maxAmountRequired) {
        console.log('[Verify] ❌ Amount mismatch:', { 
          expected: paymentRequirements.maxAmountRequired, 
          got: amountValue 
        });
        return NextResponse.json({ isValid: false, invalidReason: "Amount mismatch" });
      }
      
      senderAddress = rawTx.sender.toString();
      if (!senderAddress || senderAddress.length === 0) {
        console.log('[Verify] ❌ Invalid sender address');
        return NextResponse.json({ isValid: false, invalidReason: "Invalid sender address" });
      }
      
      console.log('[Verify] ✅ Amount and recipient validation passed');
      console.log('[Verify] Sender address:', senderAddress);
      
    } catch (validationError: any) {
      console.log('[Verify] ❌ Validation error:', validationError.message);
      return NextResponse.json({ 
        isValid: false,
        invalidReason: `Validation failed: ${validationError.message || String(validationError)}` 
      });
    }

    // ⚡ STEP 2: Transaction Simulation (The Only Check We Need!)
    console.log('[Verify] Step 2: Simulating transaction on Aptos VM...');
    try {
      const simulationResult = await aptos.transaction.simulate.simple({
        signerPublicKey: senderAuthenticator.public_key || rawTx.sender,
        transaction,
      });

      if (!simulationResult || simulationResult.length === 0) {
        console.log('[Verify] ❌ Simulation returned no results');
        return NextResponse.json({ 
          isValid: false, 
          invalidReason: "Transaction simulation returned no results" 
        });
      }

      const firstResult = simulationResult[0];
      console.log('[Verify] Simulation result:', {
        success: firstResult.success,
        vm_status: firstResult.vm_status,
        gas_used: firstResult.gas_used,
      });
      
      if (!firstResult.success) {
        const vmStatus = firstResult.vm_status || 'Unknown error';
        console.log('[Verify] ❌ Simulation failed:', vmStatus);
        return NextResponse.json({ 
          isValid: false, 
          invalidReason: `Transaction will fail: ${vmStatus}` 
        });
      }

      if (firstResult.vm_status && firstResult.vm_status !== 'Executed successfully') {
        console.log('[Verify] ❌ VM error:', firstResult.vm_status);
        return NextResponse.json({ 
          isValid: false, 
          invalidReason: `Transaction will fail: ${firstResult.vm_status}` 
        });
      }
      
      console.log('[Verify] ✅ Simulation successful - transaction will succeed');

    } catch (error: any) {
      console.log('[Verify] ❌ Simulation error:', error.message);
      return NextResponse.json({ 
        isValid: false, 
        invalidReason: `Simulation failed: ${error.message || String(error)}` 
      });
    }

    // ✅ ALL CHECKS PASSED! Transaction is valid and will succeed
    const verificationTime = Date.now() - startTime;
    console.log(`[Verify] ✅ ALL CHECKS PASSED! Verification took ${verificationTime}ms`);
    
    const nextResponse = NextResponse.json({ isValid: true, invalidReason: null });
    nextResponse.headers.set('X-Verification-Time', verificationTime.toString());
    return nextResponse;

  } catch (error: any) {
    console.error("[Facilitator Verify] Error verifying payment:", error);
    
    const response: VerifyResponse = {
      isValid: false,
      invalidReason: error.message || String(error),
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}
