/**
 * x402 Payment Middleware for Aptos
 * Following official Coinbase x402 protocol specification
 * https://github.com/coinbase/x402
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
import { X402_VERSION, APTOS_SCHEME, APTOS_TESTNET, APTOS_MAINNET } from "./x402-protocol-types";

// ⚡ OPTIMIZATION: In-memory cache for recently verified payments
// Prevents re-verification of the same payment within a short time window
const verificationCache = new Map<string, { isValid: boolean; timestamp: number; invalidReason?: string | null }>();
const CACHE_TTL_MS = 60000; // 1 minute cache

// Clean up old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of verificationCache.entries()) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      verificationCache.delete(key);
    }
  }
}, 30000); // Clean every 30 seconds

export function paymentMiddleware(
  recipientAddress: string,
  routes: Record<string, RouteConfig>,
  facilitatorConfig: FacilitatorConfig
) {
  return async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    console.log('\n🛡️ [Middleware] Intercepting request:', pathname);
    
    const routeConfig = routes[pathname];
    if (!routeConfig) {
      console.log('[Middleware] No route config, passing through');
      return NextResponse.next();
    }

    const paymentHeader = request.headers.get("X-PAYMENT");
    console.log('[Middleware] X-PAYMENT header present:', paymentHeader ? 'YES' : 'NO');
    if (paymentHeader) {
      console.log('[Middleware] Payment header length:', paymentHeader.length);
      console.log('[Middleware] Payment header preview:', paymentHeader.substring(0, 50) + '...');
    }
    
    // Map network names to full Aptos network identifiers
    const routeNetwork = routeConfig.network!;
    const network = routeNetwork === "mainnet" 
      ? APTOS_MAINNET 
      : routeNetwork === "testnet" 
      ? APTOS_TESTNET 
      : routeNetwork.startsWith("aptos-")
      ? routeNetwork
      : `aptos-${routeNetwork}`;
    
    const facilitatorUrl = facilitatorConfig.url;

    // Fast-fail validation
    if (!recipientAddress) {
      return NextResponse.json(
        { error: "Server configuration error: Payment recipient not configured" },
        { status: 500 }
      );
    }

    // Build payment requirements per x402 spec
    const paymentRequirements: PaymentRequirements = {
      scheme: APTOS_SCHEME,
      network: network,
      maxAmountRequired: routeConfig.price,
      resource: request.url,
      description: routeConfig.config?.description!,
      mimeType: routeConfig.config?.mimeType!,
      outputSchema: routeConfig.config?.outputSchema!,
      payTo: recipientAddress,
      maxTimeoutSeconds: routeConfig.config?.maxTimeoutSeconds!,
      extra: null,
    };
    
    console.log('[Middleware] Payment requirements:', {
      scheme: paymentRequirements.scheme,
      network: paymentRequirements.network,
      amount: paymentRequirements.maxAmountRequired,
      recipient: paymentRequirements.payTo,
    });

    // If no payment provided, return 402 with payment requirements
    if (!paymentHeader) {
      console.log('[Middleware] ❌ No payment header, returning 402');
      return NextResponse.json({
        x402Version: X402_VERSION,
        accepts: [paymentRequirements],
      }, { status: 402 });
    }

    // ⚡ OPTIMIZATION: Direct JSON parse (no base64 decode)
    console.log('[Middleware] Step 1: Parsing payment header...');
    let paymentPayload: PaymentPayload;
    
    try {
      paymentPayload = JSON.parse(paymentHeader);
      console.log('[Middleware] ✅ Payment header parsed:', {
        x402Version: paymentPayload.x402Version,
        scheme: paymentPayload.scheme,
        network: paymentPayload.network,
        hasTransaction: !!paymentPayload.payload?.transaction,
        hasSignature: !!paymentPayload.payload?.signature,
        transactionSize: paymentPayload.payload?.transaction?.length || 0,
        signatureSize: paymentPayload.payload?.signature?.length || 0,
      });
    } catch {
      console.log('[Middleware] ❌ Failed to parse payment header');
      return NextResponse.json({ error: "Invalid X-PAYMENT header format" }, { status: 400 });
    }

    // ⚡ OPTIMIZATION: Skip validation, let facilitator handle it (saves ~5ms)
    
    try {
      // ⚡ OPTIMIZATION: Direct verification, no caching overhead
      console.log('[Middleware] Step 2: Calling facilitator /verify endpoint...');
      const verifyRequest = {
        x402Version: X402_VERSION,
        paymentHeader,
        paymentRequirements,
      };
      console.log('[Middleware] Verify request payload:', {
        x402Version: verifyRequest.x402Version,
        paymentHeaderLength: verifyRequest.paymentHeader.length,
        paymentRequirements: {
          scheme: verifyRequest.paymentRequirements.scheme,
          network: verifyRequest.paymentRequirements.network,
          amount: verifyRequest.paymentRequirements.maxAmountRequired,
          recipient: verifyRequest.paymentRequirements.payTo,
        },
      });
      
      const verifyResponse = await fetch(`${facilitatorUrl}/verify`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Connection": "keep-alive" // ⚡ HTTP/2 + keep-alive
        },
        body: JSON.stringify(verifyRequest),
      });

      const verification = await verifyResponse.json() as VerifyResponse;
      const verificationTime = verifyResponse.headers.get('x-verification-time');
      console.log('[Middleware] Verify response:', {
        isValid: verification.isValid,
        invalidReason: verification.invalidReason,
        verificationTime: verificationTime || 'N/A',
      });

      if (!verification.isValid) {
        return NextResponse.json({
          error: "Payment verification failed",
          message: verification.invalidReason,
        }, { status: 403 });
      }
      
      // ⚡ AGGRESSIVE: 3-second timeout for settlement
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      try {
        console.log('[Middleware] Step 3: Calling facilitator /settle endpoint...');
        const settleRequest = {
          x402Version: X402_VERSION,
          paymentHeader,
          paymentRequirements,
        };
        console.log('[Middleware] Settle request payload:', {
          x402Version: settleRequest.x402Version,
          paymentHeaderLength: settleRequest.paymentHeader.length,
          paymentRequirements: {
            scheme: settleRequest.paymentRequirements.scheme,
            network: settleRequest.paymentRequirements.network,
            amount: settleRequest.paymentRequirements.maxAmountRequired,
            recipient: settleRequest.paymentRequirements.payTo,
          },
        });
        
        const settleResponse = await fetch(`${facilitatorUrl}/settle`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Connection": "keep-alive" },
          body: JSON.stringify(settleRequest),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const settlement = await settleResponse.json() as SettleResponse;
        const settlementTime = settleResponse.headers.get('x-settlement-time');
        console.log('[Middleware] Settle response:', {
          success: settlement.success,
          txHash: settlement.txHash,
          networkId: settlement.networkId,
          error: settlement.error,
          settlementTime: settlementTime || 'N/A',
        });

        if (!settlement.success) {
          return NextResponse.json({
            error: "Payment settlement failed",
            message: settlement.error,
          }, { status: 402 });
        }
        
        const response = await NextResponse.next();
        const responseHeaders = new Headers(response.headers);
        
        responseHeaders.set("X-Payment-Response", 
          Buffer.from(JSON.stringify({ settlement })).toString('base64')
        );
        
        if (verificationTime) responseHeaders.set('X-Verification-Time', verificationTime);
        if (settlementTime) responseHeaders.set('X-Settlement-Time', settlementTime);

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
        });
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          return NextResponse.json({ error: "Settlement timeout" }, { status: 408 });
        }
        throw fetchError;
      }
    } catch (error) {
      return NextResponse.json({
        error: "Payment processing failed",
        message: error instanceof Error ? error.message : String(error),
      }, { status: 500 });
    }
  };
}
