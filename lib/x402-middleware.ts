/**
 * x402 Payment Middleware for Aptos - Version 2
 * 
 * Intercepts requests to protected routes and handles x402 payment flow:
 * 1. No payment header → Return 402 with payment requirements
 * 2. Payment header → Verify → Settle → Pass through to API
 */

import { NextRequest, NextResponse } from "next/server";
import type { RouteConfig, FacilitatorConfig } from "./x402-types";
import type {
  PaymentRequiredResponse,
  PaymentRequirements,
  PaymentPayload,
  VerifyRequest,
  VerifyResponse,
  SettleRequest,
  SettleResponse,
} from "./x402-protocol-types";
import {
  X402_VERSION,
  APTOS_SCHEME,
  PAYMENT_REQUIRED_HEADER,
  PAYMENT_HEADER,
  PAYMENT_RESPONSE_HEADER,
  validateCAIP2Network,
} from "./x402-protocol-types";

export function paymentMiddleware(
  recipientAddress: string,
  routes: Record<string, RouteConfig>,
  facilitatorConfig: FacilitatorConfig
) {
  return async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    console.log('\n' + '='.repeat(60));
    console.log('🛡️ [MIDDLEWARE] Incoming request');
    console.log('='.repeat(60));
    console.log('[MIDDLEWARE] Path:', pathname);
    console.log('[MIDDLEWARE] Method:', request.method);

    const routeConfig = routes[pathname];
    if (!routeConfig) {
      console.log('[MIDDLEWARE] ➡️ No config for this route, passing through');
      console.log('='.repeat(60) + '\n');
      return NextResponse.next();
    }

    // Validate configuration
    const network = routeConfig.network || 'aptos:2';
    try {
      validateCAIP2Network(network);
    } catch (e) {
      console.log('[MIDDLEWARE] ❌ Invalid network:', e);
      return NextResponse.json({ error: `Invalid network: ${e}` }, { status: 500 });
    }

    if (!routeConfig.asset) {
      console.log('[MIDDLEWARE] ❌ No asset configured');
      return NextResponse.json({ error: "Asset required in route config" }, { status: 500 });
    }

    if (!recipientAddress) {
      console.log('[MIDDLEWARE] ❌ No recipient configured');
      return NextResponse.json({ error: "Recipient not configured" }, { status: 500 });
    }

    const sponsored = routeConfig.sponsored ?? true;

    // Build payment requirements
    const requirements: PaymentRequirements = {
      scheme: APTOS_SCHEME,
      network,
      amount: routeConfig.price,
      asset: routeConfig.asset,
      payTo: recipientAddress,
      maxTimeoutSeconds: routeConfig.config?.maxTimeoutSeconds || 60,
      extra: { sponsored },
    };

    console.log('[MIDDLEWARE] Route config:', {
      price: routeConfig.price,
      network,
      asset: routeConfig.asset.substring(0, 30) + '...',
      recipient: recipientAddress.substring(0, 20) + '...',
      sponsored,
    });

    // Check for payment header
    const paymentHeader = request.headers.get(PAYMENT_HEADER);

    if (!paymentHeader) {
      console.log('[MIDDLEWARE] ❌ No payment header → Returning 402');
      console.log('='.repeat(60) + '\n');

      // V2: Payment requirements go in PAYMENT-REQUIRED header, not body
      const paymentRequirements: PaymentRequiredResponse = {
        x402Version: X402_VERSION,
        accepts: [requirements],
      };

      const headers = new Headers();
      headers.set(PAYMENT_REQUIRED_HEADER, Buffer.from(JSON.stringify(paymentRequirements)).toString('base64'));
      headers.set('Content-Type', 'application/json');

      // Body can optionally contain a human-readable message
      return new Response(JSON.stringify({ error: 'Payment Required' }), {
        status: 402,
        headers,
      });
    }

    // Parse payment payload
    console.log('[MIDDLEWARE] 💳 Payment header received (length:', paymentHeader.length + ')');

    let payload: PaymentPayload;
    try {
      payload = JSON.parse(paymentHeader);
      console.log('[MIDDLEWARE] Parsed payment:', {
        version: payload.x402Version,
        resource: payload.resource?.url,
        amount: payload.accepted?.amount,
        hasTransaction: !!payload.payload?.transaction,
        txSize: payload.payload?.transaction?.length || 0,
      });
    } catch {
      console.log('[MIDDLEWARE] ❌ Invalid payment header JSON');
      return NextResponse.json({ error: "Invalid payment header" }, { status: 400 });
    }

    const facilitatorUrl = facilitatorConfig.url;

    try {
      // ========== VERIFY ==========
      console.log('[MIDDLEWARE] 🔍 Calling /verify...');

      const verifyReq: VerifyRequest = {
        x402Version: X402_VERSION,
        paymentHeader,
        paymentRequirements: requirements,
      };

      const verifyRes = await fetch(`${facilitatorUrl}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verifyReq),
      });

      const verification: VerifyResponse = await verifyRes.json();
      const verifyTime = verifyRes.headers.get('verification-time');

      console.log('[MIDDLEWARE] Verify result:', {
        isValid: verification.isValid,
        reason: verification.invalidReason,
        time: verifyTime + 'ms',
      });

      if (!verification.isValid) {
        console.log('[MIDDLEWARE] ❌ Verification failed');
        console.log('='.repeat(60) + '\n');
        return NextResponse.json({
          error: "Payment verification failed",
          reason: verification.invalidReason,
        }, { status: 403 });
      }

      // ========== SETTLE ==========
      console.log('[MIDDLEWARE] 💰 Calling /settle...');

      const settleReq: SettleRequest = {
        x402Version: X402_VERSION,
        paymentHeader,
        paymentRequirements: requirements,
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const settleRes = await fetch(`${facilitatorUrl}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settleReq),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const settlement: SettleResponse = await settleRes.json();
      const settleTime = settleRes.headers.get('settlement-time');

      console.log('[MIDDLEWARE] Settle result:', {
        success: settlement.success,
        txHash: settlement.transaction?.substring(0, 20) + '...',
        network: settlement.network,
        payer: settlement.payer?.substring(0, 20) + '...',
        error: settlement.error,
        time: settleTime + 'ms',
      });

      if (!settlement.success) {
        console.log('[MIDDLEWARE] ❌ Settlement failed');
        console.log('='.repeat(60) + '\n');
        return NextResponse.json({
          error: "Payment settlement failed",
          reason: settlement.error,
        }, { status: 402 });
      }

      // ========== SUCCESS - PASS THROUGH ==========
      console.log('[MIDDLEWARE] ✅ Payment successful! Passing to API...');
      console.log('='.repeat(60) + '\n');

      const response = await NextResponse.next();
      const headers = new Headers(response.headers);

      // Add payment response header
      const paymentResponse = {
        success: true,
        transaction: settlement.transaction,
        network: settlement.network,
        payer: settlement.payer,
      };
      headers.set(PAYMENT_RESPONSE_HEADER, Buffer.from(JSON.stringify(paymentResponse)).toString('base64'));

      if (verifyTime) headers.set('Verification-Time', verifyTime);
      if (settleTime) headers.set('Settlement-Time', settleTime);

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });

    } catch (error: any) {
      console.log('[MIDDLEWARE] ❌ Error:', error.message);
      console.log('='.repeat(60) + '\n');

      if (error.name === 'AbortError') {
        return NextResponse.json({ error: "Settlement timeout" }, { status: 408 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  };
}
