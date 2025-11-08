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
    "/api/protected/random": {
      price: "100000",   // 0.001 APT
      network: process.env.APTOS_NETWORK!,
      config: {
        description: "Access to random data API (0.001 APT)",
      },
    },
    "/api/protected/jsonplaceholder": {
      price: "50000",   // 0.0005 APT
      network: process.env.APTOS_NETWORK!,
      config: {
        description: "Access to JSONPlaceholder API - posts, users, todos (0.0005 APT)",
      },
    },
    "/api/protected/dogs": {
      price: "30000",   // 0.0003 APT
      network: process.env.APTOS_NETWORK!,
      config: {
        description: "Access to Dog API - random dog images (0.0003 APT)",
      },
    },
    "/api/protected/catfacts": {
      price: "20000",   // 0.0002 APT
      network: process.env.APTOS_NETWORK!,
      config: {
        description: "Access to Cat Facts API - random cat facts (0.0002 APT)",
      },
    },
    "/api/protected/randomuser": {
      price: "40000",   // 0.0004 APT
      network: process.env.APTOS_NETWORK!,
      config: {
        description: "Access to Random User API - realistic user profiles (0.0004 APT)",
      },
    },
    "/api/protected/countries": {
      price: "60000",   // 0.0006 APT
      network: process.env.APTOS_NETWORK!,
      config: {
        description: "Access to REST Countries API - country information (0.0006 APT)",
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

