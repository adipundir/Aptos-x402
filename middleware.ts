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
    "/api/protected/openmeteo": {
      price: "25000",   // 0.00025 APT
      network: process.env.APTOS_NETWORK!,
      config: {
        description: "Access to Open-Meteo weather forecast API (0.00025 APT)",
      },
    },
    "/api/protected/hackernews": {
      price: "25000",   // 0.00025 APT
      network: process.env.APTOS_NETWORK!,
      config: {
        description: "Access to Hacker News search API (Algolia) (0.00025 APT)",
      },
    },
    "/api/protected/worldtime": {
      price: "20000",   // 0.0002 APT
      network: process.env.APTOS_NETWORK!,
      config: {
        description: "Access to WorldTime API - timezone time data (0.0002 APT)",
      },
    },
    "/api/protected/github": {
      price: "40000",   // 0.0004 APT
      network: process.env.APTOS_NETWORK!,
      config: {
        description: "Access to GitHub public repo metadata API (0.0004 APT)",
      },
    },
    "/api/protected/exchangerate": {
      price: "30000",   // 0.0003 APT
      network: process.env.APTOS_NETWORK!,
      config: {
        description: "Access to Exchange Rates API - currency conversion (0.0003 APT)",
      },
    },
    "/api/protected/jokes": {
      price: "15000",   // 0.00015 APT
      network: process.env.APTOS_NETWORK!,
      config: {
        description: "Access to Jokes API - random programming jokes (0.00015 APT)",
      },
    },
    "/api/protected/quotes": {
      price: "20000",   // 0.0002 APT
      network: process.env.APTOS_NETWORK!,
      config: {
        description: "Access to Quotes API - inspirational quotes (0.0002 APT)",
      },
    },
    "/api/protected/dictionary": {
      price: "25000",   // 0.00025 APT
      network: process.env.APTOS_NETWORK!,
      config: {
        description: "Access to Dictionary API - word definitions (0.00025 APT)",
      },
    },
    "/api/protected/ipgeolocation": {
      price: "30000",   // 0.0003 APT
      network: process.env.APTOS_NETWORK!,
      config: {
        description: "Access to IP Geolocation API - IP address lookup (0.0003 APT)",
      },
    },
    "/api/protected/holidays": {
      price: "25000",   // 0.00025 APT
      network: process.env.APTOS_NETWORK!,
      config: {
        description: "Access to Public Holidays API - country holidays (0.00025 APT)",
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

