/**
 * Next.js Middleware Configuration
 * 
 * This file configures x402 payment protection for your API routes.
 * When publishing as npm package, users will create their own middleware.ts
 * and import paymentMiddleware from your package.
 */

import { paymentMiddleware } from "./lib/x402-middleware";

// Configure protected routes and their payment requirements
export const middleware = paymentMiddleware(
  process.env.PAYMENT_RECIPIENT_ADDRESS!,
  {
    "/api/protected/weather": {
      price: "10",   // 0.00000001 APT in Octas
      network: process.env.APTOS_NETWORK!,
      config: {
        description: "Access to weather data API (0.00000001 APT)",
      },
    },
    "/api/protected/stocks": {
      price: "1000000",   // 0.01 APT
      network: process.env.APTOS_NETWORK!,
      config: {
        description: "Access to stock prices API (0.01 APT)",
      },
    },
    "/api/protected/news": {
      price: "500000",   // 0.005 APT
      network: process.env.APTOS_NETWORK!,
      config: {
        description: "Access to news API (0.005 APT)",
      },
    },
    "/api/protected/random": {
      price: "100000",   // 0.001 APT
      network: process.env.APTOS_NETWORK!,
      config: {
        description: "Access to random data API (0.001 APT)",
      },
    },
  },
  {
    // Facilitator URL is REQUIRED for x402 protocol
    url: process.env.FACILITATOR_URL!,
  }
);

// Configure which paths the middleware should run on
export const config = {
  matcher: ["/api/protected/:path*"],
};

