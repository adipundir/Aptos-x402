/**
 * Facilitator Settle Endpoint - x402 v2
 * 
 * POST /api/facilitator/settle
 * 
 * Settles payment transactions for fungible asset (USDC) transfers only.
 * Supports sponsored (gasless) transactions via Geomi Gas Station.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAptosClient } from "@/lib/aptos-utils";
import { SimpleTransaction, AccountAuthenticator, Deserializer } from "@aptos-labs/ts-sdk";
import type { SettleRequest, SettleResponse, PaymentPayload } from "@/lib/x402-protocol-types";
import { X402_VERSION } from "@/lib/x402-protocol-types";
import { getGasStation } from "@/lib/services/geomi-gas-station";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('\n' + '='.repeat(60));
  console.log('💰 [SETTLE] Incoming settlement request');
  console.log('='.repeat(60));

  try {
    const { x402Version, paymentHeader, paymentRequirements }: SettleRequest = await request.json();
    
    console.log('[SETTLE] Request:', {
      x402Version,
      scheme: paymentRequirements?.scheme,
      network: paymentRequirements?.network,
      amount: paymentRequirements?.amount,
      sponsored: paymentRequirements?.extra?.sponsored,
    });

    // Quick validation (network already validated by middleware)
    if (x402Version !== X402_VERSION || !paymentHeader || !paymentRequirements) {
      return json({ success: false, transaction: null, network: null, payer: null, error: "Invalid request" }, 400);
    }

    const network = paymentRequirements.network;
    const isSponsored = paymentRequirements.extra?.sponsored === true;
    const aptos = getAptosClient(network);

    // Parse payment payload
    const payload: PaymentPayload = JSON.parse(paymentHeader);
    if (!payload.payload?.transaction) {
      return json({ success: false, transaction: null, network: null, payer: null, error: "No transaction in payload" });
    }

    // Decode transaction: [txLen(4 bytes) + txBytes + sigBytes]
    const combined = Buffer.from(payload.payload.transaction, 'base64');
    const txLen = (combined[0] << 24) | (combined[1] << 16) | (combined[2] << 8) | combined[3];
    const txBytes = combined.slice(4, 4 + txLen);
    const sigBytes = combined.slice(4 + txLen);

    console.log('[SETTLE] TX decoded:', { total: combined.length, tx: txBytes.length, sig: sigBytes.length });

    // Deserialize
    let transaction: SimpleTransaction;
    let senderAuth: AccountAuthenticator;
    try {
      transaction = SimpleTransaction.deserialize(new Deserializer(txBytes));
      senderAuth = AccountAuthenticator.deserialize(new Deserializer(sigBytes));
    } catch (e: any) {
      return json({ success: false, transaction: null, network: null, payer: null, error: `Deserialization failed: ${e.message}` }, 400);
    }

    const sender = (transaction as any).rawTransaction?.sender?.toString() || '';
    const isFeePayerTx = (transaction as any).feePayerAddress !== undefined;
    
    console.log('[SETTLE] Sender:', sender.slice(-12), '| FeePayer:', isFeePayerTx, '| Sponsored:', isSponsored);
    
    let txHash: string;
    let payer: string;
    
    // Sponsored transaction via Geomi
    if (isFeePayerTx && isSponsored) {
      console.log('[SETTLE] 🎁 Submitting to Geomi...');
      
      const gasStation = getGasStation();
      if (!gasStation.isConfigured()) {
        return json({ success: false, transaction: null, network: null, payer: null, error: "Geomi not configured. Set GEOMI_API_KEY." }, 500);
      }
      
      const result = await gasStation.sponsorAndSubmitTransaction(transaction, senderAuth);
      
      if (!result.success || !result.txHash) {
        console.log('[SETTLE] ❌ Geomi failed:', result.error);
        return json({ success: false, transaction: null, network: null, payer: null, error: `Geomi failed: ${result.error}` }, 500);
      }
      
      txHash = result.txHash;
      payer = 'geomi-sponsored';
    } else {
      // Regular transaction
      console.log('[SETTLE] 📤 Submitting regular tx...');
      payer = sender;
      
      try {
        const committed = await aptos.transaction.submit.simple({ transaction, senderAuthenticator: senderAuth });
        txHash = committed.hash;
      } catch (e: any) {
        return json({ success: false, transaction: null, network: null, payer: null, error: e.message }, 500);
      }
    }

    // Background confirmation (non-blocking)
    aptos.waitForTransaction({ transactionHash: txHash, options: { checkSuccess: true, timeoutSecs: 30 } })
      .then(() => console.log('[SETTLE] ✅ Confirmed:', txHash))
      .catch((e) => console.log('[SETTLE] ⚠️ Confirmation failed:', e.message));

    const duration = Date.now() - startTime;
    console.log(`[SETTLE] ✅ DONE in ${duration}ms | TX: ${txHash}`);
    console.log('='.repeat(60) + '\n');

    const res = NextResponse.json({ success: true, transaction: txHash, network, payer, error: null } as SettleResponse);
    res.headers.set('Settlement-Time', duration.toString());
    return res;

  } catch (error: any) {
    console.log('[SETTLE] ❌ ERROR:', error.message);
    return json({ success: false, transaction: null, network: null, payer: null, error: error.message }, 500);
  }
}

function json(data: SettleResponse, status = 200) {
  return NextResponse.json(data, { status });
}
