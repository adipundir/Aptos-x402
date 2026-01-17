/**
 * Facilitator Verify Endpoint - x402 v2 (Optimized)
 * 
 * POST /api/facilitator/verify
 * 
 * SECURITY-CRITICAL validations only:
 * - Asset, recipient, amount match requirements
 * - On-chain simulation (balance check, signature validity)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAptosClient } from "@/lib/aptos-utils";
import { SimpleTransaction, AccountAuthenticator, Deserializer } from "@aptos-labs/ts-sdk";
import type { VerifyRequest, VerifyResponse, PaymentPayload } from "@/lib/x402-protocol-types";

export const dynamic = "force-dynamic";

/** Normalize address for comparison */
const normalizeAddress = (addr: string) => 
  addr.toLowerCase().replace(/^0x/, '').padStart(64, '0');

/** Extract u64 amount from BCS-encoded argument */
function extractAmount(arg: any): string {
  if (typeof arg === 'object' && arg !== null && 'value' in arg) {
    const val = arg.value;
    const data = (typeof val === 'object' && val !== null && 'value' in val) ? val.value : val;
    if (data instanceof Uint8Array || Array.isArray(data)) {
      const bytes = Array.isArray(data) ? data : Array.from(data);
      let num = BigInt(0);
      for (let i = 0; i < bytes.length; i++) {
        num += BigInt(bytes[i]) << BigInt(i * 8);
      }
      return num.toString();
    }
    return data.toString();
  }
  const str = arg.toString();
  if (str.startsWith('0x')) {
    const hex = str.slice(2);
    let num = BigInt(0);
    for (let i = 0; i < hex.length; i += 2) {
      num += BigInt(parseInt(hex.substr(i, 2), 16)) << BigInt((i / 2) * 8);
    }
    return num.toString();
  }
  return str;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('\n🔍 [Verify] Starting...');

  try {
    const { paymentHeader, paymentRequirements }: VerifyRequest = await request.json();

    // Quick fail if missing data (middleware should have validated)
    if (!paymentHeader || !paymentRequirements?.asset || !paymentRequirements?.payTo) {
      return NextResponse.json({ isValid: false, invalidReason: "Missing required fields" }, { status: 400 });
    }

    // Parse payment (already validated by middleware, just need the transaction)
    const payload: PaymentPayload = JSON.parse(paymentHeader);
    if (!payload.payload?.transaction) {
      return NextResponse.json({ isValid: false, invalidReason: "No transaction in payload" });
    }

    // Decode transaction: [txLen(4 bytes) + txBytes + sigBytes]
    const combined = Buffer.from(payload.payload.transaction, 'base64');
    const txLen = (combined[0] << 24) | (combined[1] << 16) | (combined[2] << 8) | combined[3];
    const txBytes = combined.slice(4, 4 + txLen);
    const sigBytes = combined.slice(4 + txLen);

    // Deserialize
    let transaction: SimpleTransaction;
    let senderAuth: AccountAuthenticator;
    try {
      transaction = SimpleTransaction.deserialize(new Deserializer(txBytes));
      senderAuth = AccountAuthenticator.deserialize(new Deserializer(sigBytes));
    } catch (e: any) {
      return NextResponse.json({ isValid: false, invalidReason: `Invalid transaction: ${e.message}` });
    }

    const rawTx = transaction.rawTransaction;
    const txPayload = rawTx.payload as any;

    // Extract function and args
    let functionId: string;
    let args: any[];

    if ('entryFunction' in txPayload) {
      const ef = txPayload.entryFunction;
      functionId = `${ef.module_name.address}::${ef.module_name.name?.identifier || ef.module_name.name}::${ef.function_name.identifier || ef.function_name}`;
      args = ef.args || [];
    } else if ('function' in txPayload) {
      functionId = txPayload.function.toString();
      args = txPayload.functionArguments;
    } else {
      return NextResponse.json({ isValid: false, invalidReason: "Invalid payload type" });
    }

    // Must be fungible asset transfer
    if (!functionId.includes('primary_fungible_store::transfer')) {
      return NextResponse.json({ isValid: false, invalidReason: `Invalid function: ${functionId}` });
    }

    // Extract transfer args: [asset, recipient, amount]
    const txAsset = args[0].toString();
    const txRecipient = args[1].toString();
    const txAmount = extractAmount(args[2]);

    console.log('[Verify] TX:', { function: functionId.split('::').pop(), asset: txAsset.slice(-12), recipient: txRecipient.slice(-12), amount: txAmount });

    // ═══════════════════════════════════════════════════════════════
    // SECURITY-CRITICAL: Validate against requirements
    // ═══════════════════════════════════════════════════════════════
    
    if (normalizeAddress(txAsset) !== normalizeAddress(paymentRequirements.asset)) {
      return NextResponse.json({ isValid: false, invalidReason: "Asset mismatch" });
    }
    if (normalizeAddress(txRecipient) !== normalizeAddress(paymentRequirements.payTo)) {
      return NextResponse.json({ isValid: false, invalidReason: "Recipient mismatch" });
    }
    if (txAmount !== paymentRequirements.amount) {
      return NextResponse.json({ isValid: false, invalidReason: `Amount mismatch: ${txAmount} vs ${paymentRequirements.amount}` });
    }

    // ═══════════════════════════════════════════════════════════════
    // SECURITY-CRITICAL: On-chain simulation
    // ═══════════════════════════════════════════════════════════════
    
    const aptos = getAptosClient(paymentRequirements.network);
    
    console.log('[Verify] ✅ Params valid, simulating...');
    const simStart = Date.now();
    
    const [result] = await aptos.transaction.simulate.simple({
      signerPublicKey: (senderAuth as any).public_key || rawTx.sender,
      transaction,
    });

    if (!result?.success) {
      console.log('[Verify] ❌ Simulation failed:', result?.vm_status);
      return NextResponse.json({ isValid: false, invalidReason: `Will fail: ${result?.vm_status}` });
    }

    const time = Date.now() - startTime;
    const simTime = Date.now() - simStart;
    console.log(`[Verify] ✅ VERIFIED in ${time}ms (sim: ${simTime}ms, gas: ${result.gas_used})`);

    const response = NextResponse.json({ isValid: true, invalidReason: null } as VerifyResponse);
    response.headers.set('Verification-Time', time.toString());
    return response;

  } catch (error: any) {
    console.error('[Verify] Error:', error.message);
    return NextResponse.json({ isValid: false, invalidReason: error.message }, { status: 500 });
  }
}
