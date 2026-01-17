/**
 * Next.js Proxy Configuration (Next.js 16+)
 * 
 * This file configures x402 payment protection for your API routes.
 * 
 * x402 v2 key changes:
 * - asset field is REQUIRED (fungible asset metadata address)
 * - Only fungible assets supported (USDC, etc.) - no APT transfers
 * - All transactions can be sponsored (gasless) by the facilitator
 * - network uses CAIP-2 format (aptos:1, aptos:2) for network identification
 */

import { paymentMiddleware } from "./lib/x402-middleware";

// USDC asset address from environment
// Set USDC_MAINNET_ADDRESS or USDC_TESTNET_ADDRESS in your .env file
// Get official Circle USDC addresses: https://developers.circle.com/stablecoins/usdc-on-aptos
const USDC_ASSET = process.env.APTOS_NETWORK === "aptos:1" 
  ? process.env.USDC_MAINNET_ADDRESS
  : process.env.USDC_TESTNET_ADDRESS;

if (!USDC_ASSET) {
  throw new Error(
    `Missing USDC address. Set ${process.env.APTOS_NETWORK === "aptos:1" ? "USDC_MAINNET_ADDRESS" : "USDC_TESTNET_ADDRESS"} in your .env file.`
  );
}

console.log('[Proxy] USDC Asset:', USDC_ASSET);
console.log('[Proxy] Network:', process.env.APTOS_NETWORK);

// Configure protected routes and their payment requirements
export const proxy = paymentMiddleware(
  process.env.PAYMENT_RECIPIENT_ADDRESS!,
  {
    "/api/protected/weather": {
      price: "1000",   // 0.0001 USDC
      network: process.env.APTOS_NETWORK!,
      asset: USDC_ASSET,
      sponsored: true,  // Facilitator sponsors gas fees (default: true)
      config: {
        description: "Access to weather data API",
      },
    },
    "/api/protected/random": {
      price: "5000",   // 0.0005 USDC
      network: process.env.APTOS_NETWORK!,
      asset: USDC_ASSET,
      config: {
        description: "Access to random data API",
      },
    },
    "/api/protected/jsonplaceholder": {
      price: "2500",   // 0.0025 USDC
      network: process.env.APTOS_NETWORK!,
      asset: USDC_ASSET,
      config: {
        description: "Access to JSONPlaceholder API - posts, users, todos",
      },
    },
    "/api/protected/dogs": {
      price: "1500",   // 0.0015 USDC
      network: process.env.APTOS_NETWORK!,
      asset: USDC_ASSET,
      config: {
        description: "Access to Dog API - random dog images",
      },
    },
    "/api/protected/catfacts": {
      price: "1000",   // 0.001 USDC
      network: process.env.APTOS_NETWORK!,
      asset: USDC_ASSET,
      config: {
        description: "Access to Cat Facts API - random cat facts",
      },
    },
    "/api/protected/randomuser": {
      price: "2000",   // 0.002 USDC
      network: process.env.APTOS_NETWORK!,
      asset: USDC_ASSET,
      config: {
        description: "Access to Random User API - realistic user profiles",
      },
    },
    "/api/protected/countries": {
      price: "3000",   // 0.003 USDC
      network: process.env.APTOS_NETWORK!,
      asset: USDC_ASSET,
      config: {
        description: "Access to REST Countries API - country information",
      },
    },
    "/api/protected/openmeteo": {
      price: "1250",   // 0.00125 USDC
      network: process.env.APTOS_NETWORK!,
      asset: USDC_ASSET,
      config: {
        description: "Access to Open-Meteo weather forecast API",
      },
    },
    "/api/protected/hackernews": {
      price: "1250",   // 0.00125 USDC
      network: process.env.APTOS_NETWORK!,
      asset: USDC_ASSET,
      config: {
        description: "Access to Hacker News search API",
      },
    },
    "/api/protected/worldtime": {
      price: "1000",   // 0.001 USDC
      network: process.env.APTOS_NETWORK!,
      asset: USDC_ASSET,
      config: {
        description: "Access to WorldTime API - timezone time data",
      },
    },
    "/api/protected/github": {
      price: "2000",   // 0.002 USDC
      network: process.env.APTOS_NETWORK!,
      asset: USDC_ASSET,
      config: {
        description: "Access to GitHub public repo metadata API",
      },
    },
    "/api/protected/exchangerate": {
      price: "1500",   // 0.0015 USDC
      network: process.env.APTOS_NETWORK!,
      asset: USDC_ASSET,
      config: {
        description: "Access to Exchange Rates API - currency conversion",
      },
    },
    "/api/protected/jokes": {
      price: "750",   // 0.00075 USDC
      network: process.env.APTOS_NETWORK!,
      asset: USDC_ASSET,
      config: {
        description: "Access to Jokes API - random programming jokes",
      },
    },
    "/api/protected/quotes": {
      price: "1000",   // 0.001 USDC
      network: process.env.APTOS_NETWORK!,
      asset: USDC_ASSET,
      config: {
        description: "Access to Quotes API - inspirational quotes",
      },
    },
    "/api/protected/dictionary": {
      price: "1250",   // 0.00125 USDC
      network: process.env.APTOS_NETWORK!,
      asset: USDC_ASSET,
      config: {
        description: "Access to Dictionary API - word definitions",
      },
    },
    "/api/protected/ipgeolocation": {
      price: "1500",   // 0.0015 USDC
      network: process.env.APTOS_NETWORK!,
      asset: USDC_ASSET,
      config: {
        description: "Access to IP Geolocation API - IP address lookup",
      },
    },
    "/api/protected/holidays": {
      price: "1250",   // 0.00125 USDC
      network: process.env.APTOS_NETWORK!,
      asset: USDC_ASSET,
      config: {
        description: "Access to Public Holidays API - country holidays",
      },
    },
  },
  {
    // Facilitator URL is REQUIRED for x402 protocol
    url: process.env.FACILITATOR_URL!,
  }
);

// Configure which paths the proxy should run on
export const config = {
  matcher: ["/api/protected/:path*"],
};
