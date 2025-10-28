/**
 * @x402/aptos - Next.js Middleware
 * 
 * Official x402 payment middleware for Next.js applications
 * Based on Coinbase x402 protocol: https://github.com/coinbase/x402
 * 
 * @example
 * ```typescript
 * // middleware.ts
 * import { paymentMiddleware } from '@x402/aptos/server';
 * 
 * export const middleware = paymentMiddleware(
 *   process.env.PAYMENT_RECIPIENT_ADDRESS!,
 *   {
 *     '/api/premium/weather': {
 *       price: '1000000', // 0.01 APT in Octas
 *       network: 'testnet',
 *       config: {
 *         description: 'Premium weather data API',
 *       },
 *     },
 *   },
 *   {
 *     url: process.env.FACILITATOR_URL!,
 *   }
 * );
 * 
 * export const config = {
 *   matcher: ['/api/premium/:path*'],
 * };
 * ```
 */

import { NextRequest, NextResponse } from "next/server";
import type {
  PaymentRequiredResponse,
  PaymentRequirements,
  PaymentPayload,
  VerifyRequest,
  VerifyResponse,
  SettleRequest,
  SettleResponse,
  RouteConfig,
  FacilitatorConfig,
} from "../types";
import {
  X402_VERSION,
  APTOS_SCHEME,
  APTOS_TESTNET,
  APTOS_MAINNET,
} from "../types";

/**
 * Creates x402 payment middleware for Next.js applications
 * 
 * @param recipientAddress - Aptos address to receive payments
 * @param routes - Map of route paths to payment configurations
 * @param facilitatorConfig - Facilitator server configuration
 * @returns Next.js middleware function
 */
export function paymentMiddleware(
  recipientAddress: string,
  routes: Record<string, RouteConfig>,
  facilitatorConfig: FacilitatorConfig
) {
  return async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[x402 Middleware] Request to: ${pathname}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    // Check if this route is protected
    const routeConfig = routes[pathname];
    if (!routeConfig) {
      console.log(`[x402 Middleware] Route not protected, passing through`);
      return NextResponse.next();
    }

    console.log(`[x402 Middleware] ✅ Route is protected`);

    const paymentHeader = request.headers.get("X-PAYMENT");
    
    // Map simple network names to full Aptos network identifiers
    const simpleNetwork = routeConfig.network;
    if (!simpleNetwork) {
      throw new Error('Network not specified in route configuration');
    }
    const network = simpleNetwork === "mainnet" 
      ? APTOS_MAINNET 
      : simpleNetwork === "testnet" 
      ? APTOS_TESTNET 
      : `aptos-${simpleNetwork}`;
    
    const facilitatorUrl = facilitatorConfig.url;

    console.log(`[x402 Middleware] Configuration:`, {
      recipient: recipientAddress,
      price: routeConfig.price,
      network,
      facilitator: facilitatorUrl,
      hasPayment: !!paymentHeader,
    });

    // Validate configuration
    if (!recipientAddress) {
      console.error(`[x402 Middleware] ❌ No recipient address configured`);
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
      description: routeConfig.config?.description || "Access to protected resource",
      mimeType: routeConfig.config?.mimeType || "application/json",
      outputSchema: routeConfig.config?.outputSchema || null,
      payTo: recipientAddress,
      maxTimeoutSeconds: routeConfig.config?.maxTimeoutSeconds || 60,
      extra: null,
    };

    // If no payment provided, return 402 with payment requirements per x402 spec
    if (!paymentHeader) {
      console.log(`[x402 Middleware] 💳 No payment header found, returning 402`);
      
      const response402: PaymentRequiredResponse = {
        x402Version: X402_VERSION,
        accepts: [paymentRequirements],
      };
      
      console.log(`[x402 Middleware] 402 Response (x402 spec):`, response402);
      return NextResponse.json(response402, { status: 402 });
    }

    console.log(`[x402 Middleware] 💰 Payment header found (${paymentHeader.length} chars)`);
    console.log(`[x402 Middleware] Payment preview: ${paymentHeader.substring(0, 50)}...`);

    try {
      // Parse the X-PAYMENT header (base64 encoded PaymentPayload)
      const paymentPayloadJson = Buffer.from(paymentHeader, 'base64').toString('utf-8');
      const paymentPayload: PaymentPayload = JSON.parse(paymentPayloadJson);
      
      console.log(`[x402 Middleware] Parsed payment payload:`, {
        x402Version: paymentPayload.x402Version,
        scheme: paymentPayload.scheme,
        network: paymentPayload.network,
      });

      // Validate payment payload format
      if (paymentPayload.x402Version !== X402_VERSION) {
        console.error(`[x402 Middleware] ❌ Unsupported x402 version: ${paymentPayload.x402Version}`);
        return NextResponse.json(
          { error: `Unsupported x402 version: ${paymentPayload.x402Version}` },
          { status: 400 }
        );
      }

      if (paymentPayload.scheme !== APTOS_SCHEME) {
        console.error(`[x402 Middleware] ❌ Unsupported scheme: ${paymentPayload.scheme}`);
        return NextResponse.json(
          { error: `Unsupported payment scheme: ${paymentPayload.scheme}` },
          { status: 400 }
        );
      }

      // Step 1: Verify payment (fast, no blockchain submission)
      console.log(`\n🔍 [x402 Middleware] STEP 1: Verifying payment`);
      console.log(`[x402 Middleware] Calling: ${facilitatorUrl}/verify`);
      
      const verifyRequest: VerifyRequest = {
        x402Version: X402_VERSION,
        paymentHeader: paymentHeader,
        paymentRequirements: paymentRequirements,
      };
      
      const verifyResponse = await fetch(`${facilitatorUrl}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verifyRequest),
      });

      const verification = await verifyResponse.json() as VerifyResponse;
      const verificationTime = verifyResponse.headers.get('x-verification-time');
      console.log(`[x402 Middleware] Verification result:`, verification);
      if (verificationTime) {
        console.log(`[x402 Middleware] ⏱️  Verification took ${verificationTime}ms`);
      }

      // Check if payment is valid
      if (!verification.isValid) {
        console.error(`❌ [x402 Middleware] Verification FAILED`);
        console.error(`[x402 Middleware] Reason:`, verification.invalidReason);
        return NextResponse.json(
          {
            error: "Payment verification failed",
            message: verification.invalidReason,
          },
          { status: 403 }
        );
      }

      console.log(`✅ [x402 Middleware] Verification SUCCESS`);

      // Step 2: Settle payment BEFORE providing resource
      console.log(`\n💰 [x402 Middleware] STEP 2: Settling payment`);
      console.log(`[x402 Middleware] Calling: ${facilitatorUrl}/settle`);
      
      const settleRequest: SettleRequest = {
        x402Version: X402_VERSION,
        paymentHeader: paymentHeader,
        paymentRequirements: paymentRequirements,
      };
      
      const settleResponse = await fetch(`${facilitatorUrl}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settleRequest),
      });

      const settlement = await settleResponse.json() as SettleResponse;
      const settlementTime = settleResponse.headers.get('x-settlement-time');
      console.log(`[x402 Middleware] Settlement result:`, settlement);
      if (settlementTime) {
        console.log(`[x402 Middleware] ⏱️  Settlement took ${settlementTime}ms`);
      }

      // Step 3: Only continue if payment settled successfully
      if (!settlement.success) {
        console.error(`\n❌ [x402 Middleware] Settlement FAILED`);
        console.error(`[x402 Middleware] Error:`, settlement.error);
        return NextResponse.json(
          {
            error: "Payment settlement failed",
            message: settlement.error,
          },
          { status: 402 } // Payment required - settlement failed
        );
      }

      console.log(`✅ [x402 Middleware] Settlement SUCCESS`);
      console.log(`[x402 Middleware] Transaction hash:`, settlement.txHash);

      // Step 4: Payment settled! Now execute the route handler
      const response = await NextResponse.next();

      // Step 5: Add X-PAYMENT-RESPONSE header per x402 spec
      const responseHeaders = new Headers(response.headers);
      const paymentResponse = {
        settlement: settlement,
      };
      responseHeaders.set(
        "X-Payment-Response",
        Buffer.from(JSON.stringify(paymentResponse)).toString('base64')
      );

      // Add timing headers for client debugging
      if (verificationTime) {
        responseHeaders.set('X-Verification-Time', verificationTime);
      }
      if (settlementTime) {
        responseHeaders.set('X-Settlement-Time', settlementTime);
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      console.error(`[x402 Middleware] Error processing payment for ${pathname}:`, error);
      return NextResponse.json(
        {
          error: "Payment processing failed",
          message: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }
  };
}

